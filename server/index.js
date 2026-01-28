// server/index.js - VERSÃO PROFISSIONAL (PRISMA + SQLITE)
const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

const app = express();
const prisma = new PrismaClient();
const SECRET_KEY = process.env.JWT_SECRET || "sua_chave_secreta_super_segura_aqui"; // Usa ENV ou fallback

app.use(express.json({ limit: '50mb' })); // Aumentado para suportar imports grandes
app.use(express.raw({ type: 'application/octet-stream', limit: '100mb' })); // Para upload de backup
app.use(cors());

// --- MIDDLEWARES ---

// Verifica se o usuário está logado
const authenticate = async (req, res, next) => { // Tornar async para buscar o usuário
  const token = req.headers.authorization?.split(" ")[1] || req.query.token;
  if (!token) return res.status(401).json({ error: "Token não fornecido" });

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.userId = decoded.id;
    req.user = await prisma.user.findUnique({ where: { id: decoded.id } }); // Adiciona o objeto user completo
    if (!req.user || !req.user.active) return res.status(401).json({ error: "Usuário não encontrado ou inativo" });
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido" });
  }
};

// Helper para converter o formato do Prisma para o formato que o Front espera
const mapItemToFront = (item) => ({
  ...item,
  name: `${item.brand} ${item.model}`, // Garante nome para exibição
  category: item.isConsumable ? 'material' : 'equipamento', // Reconverte para o front
  clientName: item.currentHolder, // Mapeia currentHolder de volta para clientName
  location: item.currentLocation,
  patrimony: item.assetTag, // Mapeia assetTag para patrimony,
  observations: item.observations,
});

// Helper para compatibilidade com banco legado (Garante Technician para History)
const getTechConnect = async (userId) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return undefined;
    let tech = await prisma.technician.findFirst({ where: { name: user.name } });
    if (!tech) tech = await prisma.technician.create({ data: { name: user.name, active: true } });
    return { connect: { id: tech.id } };
  } catch (e) {
    return undefined;
  }
};

// Helper de Auditoria
const logAudit = async (userId, action, resource, details) => {
  try {
    await prisma.auditLog.create({
      data: { userId, action, resource, details }
    });
  } catch (e) { console.error("Erro ao gravar auditoria:", e); }
};

// Helper de Backup Automático
const createAutoBackup = (prefix) => {
  try {
    const dbPath = path.join(__dirname, 'prisma/dev.db');
    const backupDir = path.join(__dirname, 'backups');
    
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `AUTO-${prefix}-${timestamp}.db`);

    fs.copyFileSync(dbPath, backupPath);
    console.log(`✅ Backup automático criado: ${backupPath}`);

    // Limpeza: Manter apenas os últimos 5 backups automáticos
    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('AUTO-') && f.endsWith('.db'))
      .map(f => ({ name: f, time: fs.statSync(path.join(backupDir, f)).mtime.getTime() }))
      .sort((a, b) => b.time - a.time); // Mais recentes primeiro

    if (files.length > 5) {
      files.slice(5).forEach(file => {
        try { fs.unlinkSync(path.join(backupDir, file.name)); } catch(e){}
      });
    }
  } catch (e) {
    console.error("❌ Falha no backup automático:", e);
  }
};

// --- ROTAS DE AUTENTICAÇÃO ---

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    // Busca usuário no banco
    const user = await prisma.user.findUnique({ where: { username } });
    
    // Se não existir ou senha errada
    if (!user || !bcrypt.compareSync(password, user.password) || user.active === false) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    // Atualiza data do último login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    // Gera token válido por 24h
    const token = jwt.sign({ id: user.id, role: user.role }, SECRET_KEY, { expiresIn: "24h" });

    // Verifica se a senha é a padrão "mudar123"
    const isDefaultPassword = bcrypt.compareSync("mudar123", user.password);

    // Retorna dados (sem a senha!)
    const { password: _, ...userSafe } = user;
    
    // Garante que allowedCities seja um array (vem como string do banco)
    try {
      userSafe.allowedCities = userSafe.allowedCities ? JSON.parse(userSafe.allowedCities) : [];
    } catch (e) { userSafe.allowedCities = []; }

    res.json({ user: userSafe, token, mustChangePassword: isDefaultPassword });
  } catch (error) {
    res.status(500).json({ error: "Erro no servidor" });
  }
});

app.post("/api/forgot-password", async (req, res) => {
  const { username } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(404).json({ error: "Usuário não encontrado." });

    await logAudit(user.id, 'SOLICITACAO', 'Senha', 'Usuário solicitou redefinição de senha na tela de login.');
    
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Erro ao processar solicitação." });
  }
});

app.get("/api/notifications", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    const sevenDaysAgo = new Date(new Date().setDate(new Date().getDate() - 7));

    if (user?.role?.toLowerCase() === 'admin') {
      // --- ADMIN: Vê pendências ---
      const requests = await prisma.auditLog.findMany({
        where: {
          action: { in: ['SOLICITACAO', 'SOLICITACAO_EXCLUSAO'] },
          createdAt: { gte: sevenDaysAgo }
        },
        include: { user: { select: { name: true, username: true } } },
        orderBy: { createdAt: 'desc' }
      });

      // Adiciona nome do técnico nos detalhes para exibição no front
      const mappedRequests = requests.map(r => ({
        ...r,
        details: r.details + (r.user ? ` [Técnico: ${r.user.name}]` : '')
      }));

      // Incluir solicitações pendentes de itens
      const pendingItemRequests = await prisma.pendingRequest.findMany({
        where: { status: 'PENDING' }, // Filtra apenas pendentes para notificações
        include: { user: { select: { name: true, username: true } } },
        orderBy: { createdAt: 'desc' }
      });

      // Mapear pendingItemRequests para o mesmo formato de AuditLog para exibição unificada
      const mappedPendingRequests = pendingItemRequests.map(pr => ({
        id: pr.id,
        status: pr.status, // Adicionado status para saber se é PENDING, APPROVED ou REJECTED
        action: pr.type === 'ADD_ITEM' ? 'SOLICITACAO_CADASTRO' : (pr.type === 'EDIT_ITEM' ? 'SOLICITACAO_EDICAO' : (pr.type === 'INSTALLATION' ? 'SOLICITACAO_INSTALACAO' : 'SOLICITACAO_MOVIMENTACAO')),
        details: (pr.type === 'ADD_ITEM' ? `Solicitação de cadastro de novo item: ${JSON.parse(pr.data).brand} ${JSON.parse(pr.data).model} (Serial: ${JSON.parse(pr.data).serial})` :
                 (pr.type === 'EDIT_ITEM' ? `Solicitação de edição do item ID ${pr.itemId} (Serial: ${JSON.parse(pr.data).serial})` :
                 (pr.type === 'INSTALLATION' ? `Nova instalação para cliente: ${JSON.parse(pr.data).clientName} (${JSON.parse(pr.data).items?.length || 0} itens)` :
                 `Solicitação de movimentação do item ID ${pr.itemId} (Ação: ${JSON.parse(pr.data).action})`))) + ` [Técnico: ${pr.user?.name || '?'}]`,
        userId: pr.userId,
        user: pr.user,
        createdAt: pr.createdAt,
        isPendingRequest: true // Flag para identificar no front
      }));

      // Busca resoluções recentes para filtrar o que já foi feito
      const resolutions = await prisma.auditLog.findMany({
        where: {
          action: { in: ['RESET_SENHA', 'EXCLUIR', 'NEGADO'] },
          createdAt: { gte: sevenDaysAgo }
        }
      });

      const pending = mappedRequests.filter(req => {
        // Se for uma solicitação de item já mapeada acima, não filtra aqui (pois mappedPendingRequests já traz do banco de PendingRequest)
        // Mas requests vem de AuditLog.

        // 1. Remove se foi negado explicitamente (pelo ID da solicitação)
        if (resolutions.some(r => r.action === 'NEGADO' && r.details.includes(`solicitação #${req.id}`))) return false;

        // 2. Remove se senha já foi resetada depois da solicitação
        if (req.action === 'SOLICITACAO') {
          return !resolutions.some(r => r.action === 'RESET_SENHA' && r.details.includes(`ID ${req.userId}`) && r.createdAt > req.createdAt);
        }

        // 3. Remove se item já foi excluído depois da solicitação
        if (req.action === 'SOLICITACAO_EXCLUSAO') {
          const match = req.details.match(/ID: (\d+)/);
          const itemId = match ? match[1] : null;
          if (itemId) return !resolutions.some(r => r.action === 'EXCLUIR' && r.details.includes(`ID: ${itemId}`) && r.createdAt > req.createdAt);
        }
        return true;
      });
      res.json([...pending, ...mappedPendingRequests]); // Combina notificações de auditoria e solicitações pendentes
    } else {
      // --- USER: Vê recusas ---
      const myNotifications = await prisma.auditLog.findMany({
        where: { action: 'NEGADO', details: { contains: `de ${user.username}` }, createdAt: { gte: sevenDaysAgo } },
        orderBy: { createdAt: 'desc' }
      });
      res.json(myNotifications);
    }
  } catch (e) { res.status(500).json({ error: "Erro ao buscar solicitações" }); }
});

app.post("/api/notifications/:id/deny", authenticate, async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (user?.role?.toLowerCase() !== 'admin') return res.status(403).json({ error: "Acesso negado" });

    const requestLog = await prisma.auditLog.findUnique({ where: { id: Number(req.params.id) }, include: { user: true } });
    if (!requestLog) return res.status(404).json({ error: "Solicitação não encontrada" });

    await logAudit(req.userId, 'NEGADO', 'Solicitação', `Recusou solicitação #${requestLog.id} de ${requestLog.user.username}. Motivo: ${reason || 'Ignorado'}`);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Erro ao recusar" }); }
});

// Inicialização: Cria Admin se não existir
const initAdmin = async () => {
  const count = await prisma.user.count();
  if (count === 0) {
    console.log("⚡ Criando usuário Admin padrão...");
    await prisma.user.create({
      data: {
        username: "admin",
        password: bcrypt.hashSync("admin123", 10), // Senha criptografada
        name: "Administrador",
        role: "admin"
      }
    });
  }
};

// Inicialização: Cria Cargos Padrão
const initRoles = async () => {
  const count = await prisma.role.count();
  if (count === 0) {
    console.log("⚡ Criando cargos padrão...");
    await prisma.role.createMany({
      data: [
        { name: 'Administrador', value: 'admin', color: 'purple' },
        { name: 'Técnico', value: 'tecnico', color: 'blue' },
        { name: 'Visualizador', value: 'user', color: 'gray' }
      ]
    });
  }
};

// FIX: Garante que o banco tenha as colunas novas (userId) para evitar erros em bancos antigos
const ensureDbSchema = async () => {
  try {
    const historyInfo = await prisma.$queryRaw`PRAGMA table_info(History);`;
    if (!historyInfo.some(c => c.name === 'userId')) {
      console.log("⚠️ Corrigindo tabela History (Adicionando userId)...");
      await prisma.$executeRaw`ALTER TABLE History ADD COLUMN userId INTEGER REFERENCES User(id) ON DELETE SET NULL;`;
    }
  } catch (e) { console.error("Erro ao corrigir schema:", e); }
};

// --- ROTAS DE USUÁRIOS E CARGOS ---

app.get("/api/users", authenticate, async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    const formatted = users.map(u => ({
      ...u,
      allowedCities: u.allowedCities ? JSON.parse(u.allowedCities) : []
    }));
    res.json(formatted);
  } catch (e) { res.status(500).json({ error: "Erro ao buscar usuários" }); }
});

app.post("/api/users", authenticate, async (req, res) => {
  try {
    const { name, username, password, role, allowedCities } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
      data: {
        name,
        username,
        password: hashedPassword,
        role,
        allowedCities: JSON.stringify(allowedCities || [])
      }
    });
    await logAudit(req.userId, 'CRIAR', 'Usuário', `Criou usuário: ${username} (${role})`);
    res.json(user);
  } catch (e) { res.status(400).json({ error: "Erro ao criar usuário" }); }
});

app.put("/api/users/:id", authenticate, async (req, res) => {
  try {
    const { name, username, password, role, allowedCities, active } = req.body;
    const data = { 
      name, username, role, active,
      allowedCities: JSON.stringify(allowedCities || []) 
    };
    
    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id: Number(req.params.id) },
      data
    });
    await logAudit(req.userId, 'EDITAR', 'Usuário', `Editou usuário ID: ${req.params.id} - Status: ${active}`);
    res.json(user);
  } catch (e) { res.status(400).json({ error: "Erro ao atualizar" }); }
});

app.delete("/api/users/:id", authenticate, async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: Number(req.params.id) } });
    await logAudit(req.userId, 'EXCLUIR', 'Usuário', `Excluiu usuário ID: ${req.params.id}`);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Erro ao deletar" }); }
});

app.get("/api/roles", authenticate, async (req, res) => {
  try {
    const roles = await prisma.role.findMany();
    res.json(roles);
  } catch (e) { res.status(500).json({ error: "Erro ao buscar cargos" }); }
});

app.post("/api/roles", authenticate, async (req, res) => {
  try {
    const { name, color } = req.body;
    // Gera value (slug) a partir do nome
    const value = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");
    
    const role = await prisma.role.create({ data: { name, value, color } });
    await logAudit(req.userId, 'CRIAR', 'Cargo', `Criou cargo: ${name}`);
    res.json(role);
  } catch (e) { res.status(400).json({ error: "Erro ao criar cargo" }); }
});

app.put("/api/roles/:id", authenticate, async (req, res) => {
  try {
    const { name, color } = req.body;
    const role = await prisma.role.update({
      where: { id: Number(req.params.id) },
      data: { name, color }
    });
    await logAudit(req.userId, 'EDITAR', 'Cargo', `Editou cargo: ${name}`);
    res.json(role);
  } catch (e) { res.status(400).json({ error: "Erro ao editar cargo" }); }
});

app.delete("/api/roles/:id", authenticate, async (req, res) => {
  try {
    const role = await prisma.role.findUnique({ where: { id: Number(req.params.id) } });
    if (role.value === 'admin') return res.status(400).json({ error: "Não pode excluir Admin" });
    await prisma.role.delete({ where: { id: Number(req.params.id) } });
    await logAudit(req.userId, 'EXCLUIR', 'Cargo', `Excluiu cargo: ${role.name}`);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Erro ao deletar cargo" }); }
});

// --- ROTAS DE CONFIGURAÇÕES GERAIS (Settings.jsx) ---

app.get("/api/settings", authenticate, async (req, res) => {
  try {
    const settings = await prisma.systemSetting.findUnique({ where: { id: 'general' } });
    res.json(settings ? JSON.parse(settings.data) : {});
  } catch (e) { res.status(500).json({ error: "Erro ao buscar configurações" }); }
});

app.post("/api/settings", authenticate, async (req, res) => {
  try {
    await prisma.systemSetting.upsert({
      where: { id: 'general' },
      update: { data: JSON.stringify(req.body) },
      create: { id: 'general', data: JSON.stringify(req.body) }
    });
    await logAudit(req.userId, 'EDITAR', 'Configuração', 'Alterou configurações globais do sistema');
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Erro ao salvar configurações" }); }
});

// --- ROTAS DE ITENS (CORE) ---

app.get("/api/items", authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', status = 'all', city = 'Todas', type = 'equipamentos', sort, order, client } = req.query;
    
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    // 0. Configuração de Ordenação
    let orderBy = { updatedAt: 'desc' };
    if (sort && order) {
      const direction = order === 'asc' ? 'asc' : 'desc';
      switch (sort) {
        case 'name': orderBy = { brand: direction }; break; // Ordena por marca como aproximação do nome
        case 'patrimony': orderBy = { assetTag: direction }; break;
        case 'serial': orderBy = { serial: direction }; break;
        case 'status': orderBy = { status: direction }; break;
        case 'entryDate': orderBy = { createdAt: direction }; break;
        default: orderBy = { updatedAt: 'desc' };
      }
    }

    // 1. Construção do Filtro (WHERE)
    const where = {};

    // Filtro de Cidade (Assumindo que você adicionou 'city' no schema)
    if (city !== 'Todas') {
      where.city = city;
    }

    // Filtro de Cliente
    if (client) {
      where.currentHolder = { contains: client };
    }

    // Filtro de Tipo (Material vs Equipamento)
    if (type === 'materiais') {
      where.isConsumable = true;
      where.type = { notIn: ['cabo', 'drop'] }; // Exclui cabos da aba de materiais genéricos
    } else if (type === 'cabos') {
      where.isConsumable = true;
      where.type = { in: ['cabo', 'drop'] };
    } else if (type === 'equipamentos') {
      where.isConsumable = false;
    } else if (type === 'consumiveis') {
      where.isConsumable = true;
    }
    // Filtro de Status
    if (status !== 'all') {
      where.status = status;
    }

    // Filtro de Busca (Nome, Serial, Patrimônio)
    if (search) {
      const terms = search.trim().split(/\s+/); // Quebra a busca em termos (ex: "Huawei 8145" -> ["Huawei", "8145"])
      where.AND = terms.map(term => ({
        OR: [
          { serial: { contains: term } },
          { assetTag: { contains: term } },
          { brand: { contains: term } },
          { model: { contains: term } },
          { currentHolder: { contains: term } }
        ]
      }));
    }

    // 2. Query Principal (Paginação + Dados)
    const [total, items] = await prisma.$transaction([
      prisma.item.count({ where }),
      prisma.item.findMany({
        where,
        skip,
        take: limitNum,
        orderBy, // Usa ordenação dinâmica
        include: { history: false } // Não precisamos do histórico na lista (pesado)
      })
    ]);

    // 3. Stats Otimizados (Agregação no Banco em vez de JS)
    // Para performance máxima, calculamos stats baseados apenas na cidade, ignorando outros filtros (como o Dashboard espera)
    const statsWhere = {};
    if (city !== 'Todas') statsWhere.city = city;

    // Aplica o filtro de "mundo" nos stats também
    if (type === 'equipamentos') statsWhere.isConsumable = false;
    if (type === 'consumiveis') statsWhere.isConsumable = true;
    
    // Fazemos 3 counts rápidos no banco
    const [totalBase, available, inUse, maintenance, valueAgg] = await Promise.all([
      prisma.item.count({ where: statsWhere }),
      prisma.item.count({ where: { ...statsWhere, status: 'disponivel' } }),
      prisma.item.count({ where: { ...statsWhere, status: 'em_uso' } }),
      prisma.item.count({ where: { ...statsWhere, status: 'manutencao' } }),
      prisma.item.aggregate({
        _sum: { value: true },
        where: statsWhere
      })
    ]);

    const totalValue = valueAgg._sum.value || 0;
    const stats = { total: totalBase, available, inUse, maintenance, totalValue };

    // 4. Retorno formatado
    res.json({
      data: items.map(mapItemToFront), // Converte campos para o frontend entender
      stats,
      meta: {
        total,
        pages: Math.ceil(total / limitNum),
        page: pageNum
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar itens" });
  }
});

app.post("/api/items", authenticate, async (req, res) => {
  try {
    const data = req.body;

    // Limpeza de dados (Trim/Upper) para garantir precisão com leitores de código de barras
    if (data.serial) data.serial = data.serial.trim().toUpperCase();
    if (data.patrimony) data.patrimony = data.patrimony.trim().toUpperCase();
    if (data.mac) data.mac = data.mac.trim().toUpperCase();

    const isTechnician = req.user.role?.toLowerCase() === 'tecnico';

    // Garante serial para materiais se não informado (para técnicos e admins)
    if (data.category === 'material' && !data.serial) {
      data.serial = `MAT-${Date.now()}-${Math.floor(Math.random()*1000)}`;
    }

    // Se for técnico, cria uma solicitação em vez de criar o item diretamente
    if (isTechnician) {
      const pendingRequest = await prisma.pendingRequest.create({
        data: {
          type: 'ADD_ITEM',
          status: 'PENDING',
          data: JSON.stringify(data), // Salva todos os dados do item como JSON
          userId: req.userId
        }
      });
      await logAudit(req.userId, 'SOLICITACAO_CADASTRO', 'Item', `Solicitou cadastro de novo item (Serial: ${data.serial})`);
      return res.status(202).json({ success: true, message: "Solicitação de cadastro enviada para aprovação.", pendingRequestId: pendingRequest.id });
    }

    // Se não for técnico (admin), procede com a criação direta
    
    // De-para do formato do front para o banco
    const techConnect = await getTechConnect(req.userId);

    const newItem = await prisma.item.create({
      data: {
        type: data.type,
        brand: data.brand,
        model: data.model,
        serial: data.serial,
        assetTag: data.patrimony, // front chama de patrimony, banco assetTag
        mac: data.mac,
        status: data.status || 'disponivel',
        city: data.city, // Requer campo no schema
        currentLocation: data.location || 'Estoque',
        isConsumable: data.category === 'material',
        photo: data.photo,
        value: Number(data.value) || 0,
        observations: data.observations,
        initialAmount: Number(data.initialAmount) || null,
        currentAmount: Number(data.currentAmount) || Number(data.initialAmount) || null,
        unit: data.unit || null,
        // Cria registro inicial no histórico automaticamente
        history: {
          create: {
            action: "CRIACAO",
            description: "Item cadastrado no sistema",
            location: data.location || 'Estoque',
            technician: techConnect
          }
        }
      }
    });

    res.json(newItem);
  } catch (error) {
    // Erro de duplicidade (Serial ou Patrimônio únicos)
    if (error.code === 'P2002') {
      return res.status(400).json({ error: "Serial ou Patrimônio já cadastrados." });
    }
    console.error(error);
    res.status(500).json({ error: "Erro ao criar item" });
  }
});

// --- ROTA DE EDIÇÃO DE ITEM ---
app.put("/api/items/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    // Limpeza de dados (Trim/Upper) para edição
    if (data.serial) data.serial = data.serial.trim().toUpperCase();
    if (data.patrimony) data.patrimony = data.patrimony.trim().toUpperCase();
    if (data.mac) data.mac = data.mac.trim().toUpperCase();

    const isTechnician = req.user.role?.toLowerCase() === 'tecnico';

    // Se for técnico, cria uma solicitação de edição
    if (isTechnician) {
      const existingItem = await prisma.item.findUnique({ where: { id: Number(id) } });
      if (!existingItem) return res.status(404).json({ error: "Item não encontrado." });

      const pendingRequest = await prisma.pendingRequest.create({
        data: {
          type: 'EDIT_ITEM',
          status: 'PENDING',
          data: JSON.stringify(data), // Salva os dados da edição como JSON
          itemId: Number(id),
          userId: req.userId
        }
      });
      await logAudit(req.userId, 'SOLICITACAO_EDICAO', 'Item', `Solicitou edição do item ID ${id} (Serial: ${existingItem.serial})`);
      return res.status(202).json({ success: true, message: "Solicitação de edição enviada para aprovação.", pendingRequestId: pendingRequest.id });
    }
    
    // Validar se serial/patrimonio já existe em outro item
    if (data.serial || data.patrimony) {
      const existing = await prisma.item.findFirst({
        where: {
          OR: [
            { serial: data.serial },
            { assetTag: data.patrimony }
          ],
          NOT: { id: Number(id) }
        }
      });
      if (existing) return res.status(400).json({ error: "Serial ou Patrimônio já em uso por outro item." });
    }

    const item = await prisma.item.update({
      where: { id: Number(id) },
      data: {
        brand: data.brand,
        model: data.model,
        serial: data.serial,
        assetTag: data.patrimony, // front chama de patrimony
        mac: data.mac,
        value: Number(data.value) || 0,
        observations: data.observations,
        initialAmount: data.initialAmount !== undefined ? Number(data.initialAmount) : undefined,
        currentAmount: data.currentAmount !== undefined ? Number(data.currentAmount) : undefined,
        unit: data.unit,
      }
    });

    await logAudit(req.userId, 'EDITAR', 'Item', `Editou dados do item ${item.serial}`);
    res.json(item);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao editar item" });
  }
});

// ROTA PARA TÉCNICOS ENVIAREM MÚLTIPLOS ITENS DE UMA VEZ
app.post("/api/items/request-batch", authenticate, async (req, res) => {
  try {
    const { items } = req.body;
    const isTechnician = req.user.role?.toLowerCase() === 'tecnico' || req.user.role?.toLowerCase() === 'admin';

    if (!isTechnician) {
      return res.status(403).json({ error: "Apenas técnicos podem usar esta rota." });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Nenhum item fornecido." });
    }

    const requestsToCreate = items.map(item => {
      // Validação básica de integridade do item antes de criar a solicitação
      // Limpeza de dados
      if (item.serial) item.serial = item.serial.trim().toUpperCase();
      if (item.patrimony) item.patrimony = item.patrimony.trim().toUpperCase();

      if (!item.serial || !item.patrimony) {
        console.warn("Item inválido ignorado no lote:", item);
        return null;
      }
      return {
        type: 'ADD_ITEM',
        status: 'PENDING',
        data: JSON.stringify(item),
        userId: req.userId
      };
    }).filter(Boolean); // Remove nulos

    if (requestsToCreate.length === 0) {
      return res.status(400).json({ error: "Nenhum item válido para processar." });
    }

    // Usamos createMany para eficiência
    await prisma.pendingRequest.createMany({
      data: requestsToCreate
    });

    await logAudit(req.userId, 'SOLICITACAO_CADASTRO_LOTE', 'Item', `Solicitou cadastro de ${items.length} itens em lote.`);
    
    return res.status(202).json({ success: true, message: `Solicitação de cadastro para ${items.length} itens enviada para aprovação.` });

  } catch (error) {
    console.error("Erro ao criar solicitações em lote:", error);
    res.status(500).json({ error: "Erro ao processar a solicitação em lote." });
  }
});

// Rota para o técnico ver suas solicitações (Dashboard)
app.get("/api/my-requests", authenticate, async (req, res) => {
  try {
    const requests = await prisma.pendingRequest.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    res.json(requests);
  } catch (e) { res.status(500).json({ error: "Erro ao buscar solicitações" }); }
});

// --- ROTA DE NOVA INSTALAÇÃO (GUIA DO TÉCNICO) ---
app.post("/api/installations", authenticate, async (req, res) => {
  try {
    const { clientName, clientCode, address, coords, items, photos, observations, signature } = req.body;

    // Validação de Localização (Garante que coords tem lat/lng válidos)
    let validatedCoords = coords;
    if (coords && (typeof coords.lat !== 'number' || typeof coords.lng !== 'number')) {
      validatedCoords = null; // Descarta coords inválidas
    }

    // Limpeza de Itens (Leitor de código de barras pode deixar espaços)
    const cleanedItems = items ? items.map(i => ({
      ...i,
      serial: i.serial ? i.serial.trim().toUpperCase() : i.serial,
      patrimony: i.patrimony ? i.patrimony.trim().toUpperCase() : i.patrimony
    })) : [];
    
    // Validação básica
    if (!clientName || !cleanedItems || cleanedItems.length === 0) {
      return res.status(400).json({ error: "Dados incompletos. Informe cliente e equipamentos." });
    }

    const requestData = {
      clientName,
      clientCode,
      address,
      coords: validatedCoords,
      items: cleanedItems,
      photos, // Array de strings base64
      observations,
      signature,
      date: new Date()
    };

    await prisma.pendingRequest.create({
      data: {
        type: 'INSTALLATION', // Novo tipo de solicitação
        status: 'PENDING',
        data: JSON.stringify(requestData),
        userId: req.userId
      }
    });

    await logAudit(req.userId, 'SOLICITACAO_INSTALACAO', 'Instalação', `Nova instalação registrada para ${clientName}`);

    res.status(201).json({ success: true, message: "Instalação registrada com sucesso!" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao registrar instalação." });
  }
});

// --- ROTAS DE APROVAÇÃO/REJEIÇÃO DE SOLICITAÇÕES (ADMIN) ---
app.post("/api/admin/requests/:id/approve", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (user?.role?.toLowerCase() !== 'admin') return res.status(403).json({ error: "Acesso negado" });

    const requestId = Number(req.params.id);
    const request = await prisma.pendingRequest.findUnique({ where: { id: requestId } });
    if (!request) return res.status(404).json({ error: "Solicitação não encontrada." });
    
    const requestData = JSON.parse(request.data);
    const adminNotes = req.body?.adminNotes || '';

    // Função para limpar dados antes de salvar no banco (evita erro de campos desconhecidos)
    const cleanData = (d) => ({
      brand: d.brand,
      model: d.model,
      serial: d.serial,
      assetTag: d.patrimony || d.assetTag,
      mac: d.mac,
      status: d.status,
      city: d.city,
      currentLocation: d.location || d.currentLocation || 'Estoque',
      isConsumable: d.isConsumable || d.category === 'material',
      photo: d.photo,
      value: Number(d.value) || 0,
      observations: d.observations,
      initialAmount: Number(d.initialAmount) || null,
      currentAmount: Number(d.currentAmount) || Number(d.initialAmount) || null,
      unit: d.unit || null,
      type: d.type || 'onu'
    });

    // Verifica se o técnico solicitante ainda existe para vincular no histórico
    const requester = await prisma.user.findUnique({ where: { id: request.userId } });
    const techConnect = await getTechConnect(requester ? request.userId : req.userId);

    // INÍCIO DA TRANSAÇÃO
    await prisma.$transaction(async (tx) => {
    if (request.type === 'ADD_ITEM') {
      const dataToCreate = cleanData(requestData);
      // Adiciona histórico inicial
      dataToCreate.history = {
        create: {
          action: "CRIACAO",
          description: "Item cadastrado via Solicitação",
          location: dataToCreate.currentLocation,
          technician: techConnect
        }
      };
      await tx.item.create({ data: dataToCreate });
      await tx.auditLog.create({ data: { userId: req.userId, action: 'APROVAR_CADASTRO', resource: 'Item', details: `Aprovou cadastro do item (Serial: ${requestData.serial})` } });
    } else if (request.type === 'EDIT_ITEM') {
      const dataToUpdate = cleanData(requestData);
      // Remove campos undefined/null que não devem apagar dados existentes se não enviados
      Object.keys(dataToUpdate).forEach(key => dataToUpdate[key] === undefined && delete dataToUpdate[key]);
      
      await tx.item.update({ where: { id: request.itemId }, data: dataToUpdate });
      await tx.auditLog.create({ data: { userId: req.userId, action: 'APROVAR_EDICAO', resource: 'Item', details: `Aprovou edição do item ID ${request.itemId}` } });
    } else if (request.type === 'MOVE_ITEM') {
      await tx.item.update({ where: { id: request.itemId }, data: requestData.updateData }); 
      await tx.auditLog.create({ data: { userId: req.userId, action: 'APROVAR_MOVIMENTACAO', resource: 'Item', details: `Aprovou movimentação do item ID ${request.itemId}` } });
    } else if (request.type === 'INSTALLATION') {
      const { clientName, items, address } = requestData;
      if (!items || !Array.isArray(items)) throw new Error("Lista de itens inválida na instalação.");
      
      // Processa cada item da instalação
      for (const itemData of items) {
         if (!itemData.serial) continue; // Pula itens sem serial para evitar erro no banco

         // Verifica se o item já existe pelo serial
         let item = await tx.item.findUnique({ where: { serial: itemData.serial } });
         
         if (!item) {
            // Cria se não existir (Item novo usado na instalação)
            item = await tx.item.create({
              data: {
                serial: itemData.serial,
                brand: itemData.brand || 'Genérico',
                model: itemData.model || 'Padrão',
                type: itemData.type || 'onu',
                mac: itemData.mac,
                assetTag: itemData.patrimony || `INST-${Date.now()}-${Math.floor(Math.random()*1000)}`,
                status: 'em_uso',
                currentHolder: clientName,
                currentLocation: 'Cliente',
                city: 'Nova Maringá', // Padrão, já que o técnico não seleciona cidade na instalação
                history: { create: { action: 'INSTALACAO_NOVA', description: `Instalado em ${clientName} (${address})`, location: 'Cliente', technician: techConnect } }
              }
            });
         } else {
            // Atualiza existente (Baixa do estoque para o cliente)
            await tx.item.update({
              where: { id: item.id },
              data: {
                status: 'em_uso',
                currentHolder: clientName,
                currentLocation: 'Cliente',
                history: { create: { action: 'INSTALACAO', description: `Instalado em ${clientName} (${address})`, location: 'Cliente', technician: techConnect } }
              }
            });
         }
      }
      await tx.auditLog.create({ data: { userId: req.userId, action: 'APROVAR_INSTALACAO', resource: 'Instalação', details: `Aprovou instalação para ${clientName}` } });
    }

    await tx.pendingRequest.update({ where: { id: requestId }, data: { status: 'APPROVED', adminNotes } });
    }); // FIM DA TRANSAÇÃO

    res.json({ success: true, message: "Solicitação aprovada e item atualizado." });
  } catch (e) {
    console.error("Erro na aprovação:", e);
    // Tratamento de erro de duplicidade (P2002)
    if (e.code === 'P2002') {
      return res.status(400).json({ error: "Erro: Item já existe no sistema (Serial ou Patrimônio duplicado)." });
    }
    res.status(500).json({ error: e.message || "Erro ao aprovar solicitação." });
  }
});

app.post("/api/admin/requests/:id/reject", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (user?.role?.toLowerCase() !== 'admin') return res.status(403).json({ error: "Acesso negado" });
    const adminNotes = req.body?.adminNotes || 'Não informado';
    await prisma.pendingRequest.update({ where: { id: Number(req.params.id) }, data: { status: 'REJECTED', adminNotes } });
    await logAudit(req.userId, 'REJEITAR_SOLICITACAO', 'Item', `Rejeitou solicitação ID ${req.params.id}. Motivo: ${adminNotes}`);
    res.json({ success: true, message: "Solicitação rejeitada." });
  } catch (e) { console.error("Erro ao rejeitar:", e); res.status(500).json({ error: e.message || "Erro ao rejeitar solicitação." }); }
});

// --- ROTA DE MOVIMENTAÇÃO (AÇÃO) ---
app.post("/api/items/:id/move", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, clientName, reason } = req.body;
    
    const item = await prisma.item.findUnique({ where: { id: Number(id) } });
    if (!item) return res.status(404).json({ error: "Item não encontrado" });
    
    let updateData = {};
    let historyDescription = "";
    let historyAction = action;

    switch (action) {
      case 'CONSUMIR':
        const amountToConsume = Number(req.body.amount);
        if (isNaN(amountToConsume) || amountToConsume <= 0) {
          return res.status(400).json({ error: "Quantidade a consumir inválida." });
        }
        if (!item.isConsumable || item.currentAmount === null) {
          return res.status(400).json({ error: "Este item não é consumível." });
        }
        const newAmount = item.currentAmount - amountToConsume;
        if (newAmount < 0) {
          return res.status(400).json({ error: "Consumo excede a quantidade disponível." });
        }
        updateData = { currentAmount: newAmount };
        historyDescription = `Consumido ${amountToConsume} ${item.unit || ''}. Restante: ${newAmount} ${item.unit || ''}. Obs: ${reason || ''}`;
        historyAction = "CONSUMO"; // Ação para o histórico
        break;
      case 'TROCA_CLIENTE':
        const previousHolder = item.currentHolder || 'Estoque';
        updateData = { currentHolder: clientName, status: 'em_uso', currentLocation: 'Cliente' };
        historyDescription = `Transferido de: ${previousHolder} para: ${clientName}. Obs: ${reason || ''}`;
        break;
      case 'DEFEITO':
        updateData = { status: 'manutencao', currentLocation: 'Manutenção' };
        historyDescription = `Reportado defeito: ${reason}`;
        break;
      case 'DEVOLUCAO':
        updateData = { currentHolder: null, status: 'disponivel', currentLocation: 'Estoque' };
        historyDescription = `Devolvido ao estoque. ${reason || ''}`;
        break;
      case 'EXTRAVIO':
        updateData = { status: 'extraviado', currentLocation: 'Desconhecido' };
        historyDescription = `Registrado extravio: ${reason}`;
        break;
      case 'BAIXA':
        updateData = { status: 'baixado', currentLocation: 'Baixado' };
        historyDescription = `Baixa permanente (Cliente levou/Venda): ${reason}`;
        break;
      default:
        return res.status(400).json({ error: "Ação inválida" });
    }

    const isTechnician = req.user.role?.toLowerCase() === 'tecnico';
    if (isTechnician) {
      const pendingRequest = await prisma.pendingRequest.create({
        data: {
          type: 'MOVE_ITEM',
          status: 'PENDING',
          data: JSON.stringify({ action, clientName, reason, updateData }), // Salva a ação e dados calculados para o admin
          itemId: Number(id),
          userId: req.userId
        }
      });
      return res.status(202).json({ success: true, message: "Solicitação de movimentação enviada para aprovação.", pendingRequestId: pendingRequest.id });
    }

    const techConnect = await getTechConnect(req.userId);

    const updated = await prisma.item.update({
      where: { id: Number(id) },
      data: {
        ...updateData,
        observations: reason ? reason : undefined, // Atualiza observação do item com o motivo da movimentação se houver
        history: {
          create: {
            action: historyAction,
            description: historyDescription,
            location: updateData.currentLocation || item.currentLocation,
            technician: techConnect
          }
        }
      }
    });

    await logAudit(req.userId, 'MOVIMENTACAO', 'Item', `${historyAction} - ${item.serial}`);
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao movimentar item" });
  }
});

app.delete("/api/items/:id", authenticate, async (req, res) => {
  try {
    const { password, reason } = req.body;
    
    // 1. Verifica senha do usuário logado
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user || !password || !bcrypt.compareSync(password, user.password)) {
      return res.status(403).json({ error: "Senha incorreta." });
    }
    
    // 2. Busca item para log
    const item = await prisma.item.findUnique({ where: { id: Number(req.params.id) } });
    if (!item) return res.status(404).json({ error: "Item não encontrado." });

    // 3. Verifica Permissão
    if (user.role?.toLowerCase() === 'admin') {
      // Admin deleta direto
      await prisma.item.delete({ where: { id: Number(req.params.id) } });
      await logAudit(req.userId, 'EXCLUIR', 'Item', `Excluiu item ${item.serial} (${item.assetTag}). Motivo: ${reason} | ID: ${item.id}`);
      res.json({ success: true, type: 'deleted' });
    } else {
      // Outros criam solicitação
      if (!reason || reason.trim().length < 3) {
        return res.status(400).json({ error: "Motivo é obrigatório para solicitar exclusão." });
      }

      await logAudit(req.userId, 'SOLICITACAO_EXCLUSAO', 'Item', `Solicitou exclusão do item ${item.serial} (${item.assetTag}). Motivo: ${reason} | ID: ${item.id}`);
      res.json({ success: true, type: 'requested', message: "Solicitação enviada ao administrador." });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao excluir item." });
  }
});

// ROTA DE APROVAÇÃO DE EXCLUSÃO (ADMIN)
app.delete("/api/admin/items/:id", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (user?.role?.toLowerCase() !== 'admin') return res.status(403).json({ error: "Acesso negado" });

    const item = await prisma.item.findUnique({ where: { id: Number(req.params.id) } });
    if (!item) return res.status(404).json({ error: "Item não encontrado ou já excluído." });

    await prisma.item.delete({ where: { id: Number(req.params.id) } });
    await logAudit(req.userId, 'EXCLUIR', 'Item', `Aprovou exclusão do item ${item.serial} via Notificação. | ID: ${item.id}`);

    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Erro ao aprovar exclusão." }); }
});

// ROTA DE RESET DE SENHA (ADMIN)
app.post("/api/admin/reset-password/:id", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (user?.role?.toLowerCase() !== 'admin') return res.status(403).json({ error: "Acesso negado" });

    const targetId = Number(req.params.id);
    const defaultPassword = await bcrypt.hash("mudar123", 10);

    await prisma.user.update({ where: { id: targetId }, data: { password: defaultPassword } });
    await logAudit(req.userId, 'RESET_SENHA', 'Usuário', `Resetou senha do usuário ID ${targetId} para padrão.`);

    res.json({ success: true, message: "Senha resetada para 'mudar123'" });
  } catch (e) { res.status(500).json({ error: "Erro ao aprovar exclusão." }); }
});

// ROTA DE RESET TOTAL (ZONA DE PERIGO)
app.post("/api/admin/reset", authenticate, async (req, res) => {
  try {
    const { password } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.userId } });

    if (!user || !bcrypt.compareSync(password, user.password) || user.role?.toLowerCase() !== 'admin') {
      return res.status(403).json({ error: "Senha incorreta ou sem permissão." });
    }

    // Backup Automático antes de apagar
    createAutoBackup('RESET-TOTAL');

    // Transação para limpar TUDO (Exceto o admin que solicitou)
    await prisma.$transaction([
      prisma.history.deleteMany({}),
      prisma.item.deleteMany({}),
      prisma.auditLog.deleteMany({}),
      prisma.model.deleteMany({}),
      prisma.brand.deleteMany({}),
      prisma.user.deleteMany({ where: { id: { not: user.id } } })
    ]);

    await logAudit(req.userId, 'RESET_TOTAL', 'Sistema', 'Realizou reset de fábrica no sistema (Apagou tudo).');
    res.json({ success: true, message: "Sistema resetado com sucesso!" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao resetar sistema." });
  }
});

app.post("/api/admin/clear-inventory", authenticate, async (req, res) => {
  try {
    const { password } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.userId } });

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(403).json({ error: "Senha incorreta." });
    }

    // Backup Automático antes de limpar
    createAutoBackup('CLEAR-INVENTORY');

    // Transação para limpar itens e histórico, mantendo usuários e configurações
    await prisma.$transaction([
      prisma.history.deleteMany({}), // Limpa histórico de movimentação
      prisma.item.deleteMany({})     // Limpa itens
    ]);

    await logAudit(req.userId, 'LIMPEZA', 'Sistema', 'Realizou limpeza completa do estoque (Clear Inventory).');
    res.json({ success: true, message: "Estoque limpo com sucesso!" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao limpar estoque." });
  }
});

// --- ROTA DE IMPORTAÇÃO (Transação Segura) ---
app.post("/api/items/batch", authenticate, async (req, res) => {
  const { items } = req.body;

  // Processamos um por um para garantir validação, mas usando Promise.all para velocidade
  // Em sistemas muito grandes, usaríamos createMany, mas createMany não deixa checar duplicidade facilmente no SQLite
  
  const results = await Promise.all(items.map(async (item) => {
    try {
      // Normalização básica
      const serial = item.serial?.trim().toUpperCase();
      if (!serial && !item.patrimony) return { status: 'error', serial: 'N/A', msg: 'Sem Serial ou Patrimônio' };

      // Verifica se existe
      const existing = await prisma.item.findUnique({ where: { serial } });

      // Lógica de Status
      let finalStatus = 'disponivel';
      const s = (item.originalStatus || '').toUpperCase();
      if (item.clientName || s.includes('COMODATO') || s.includes('ATIVO') || s.includes('EM USO')) finalStatus = 'em_uso';
      else if (s.includes('DEFEITO') || s.includes('MANUTENCAO') || s.includes('QUEBRADO')) finalStatus = 'manutencao';

      const finalLocation = item.clientName ? 'Cliente' : 'Estoque';

      if (existing) {
        // Verifica se houve mudança relevante (Cliente ou Status) para gerar histórico
        const holderChanged = (existing.currentHolder || '') !== (item.clientName || '');
        const statusChanged = existing.status !== finalStatus;

        if (holderChanged || statusChanged) {
          await prisma.item.update({
            where: { id: existing.id },
            data: {
              currentHolder: item.clientName,
              currentLocation: finalLocation,
              status: finalStatus,
              value: Number(item.value) || 0,
              observations: item.observations,
              history: {
                create: {
                  action: "IMPORTACAO_ATT",
                  description: `Atualizado via CSV. ${holderChanged ? `Cliente: ${existing.currentHolder || 'N/A'} -> ${item.clientName}` : ''}`,
                  location: finalLocation
                }
              }
            }
          });
          return { status: 'updated', serial, msg: `Atualizado: ${holderChanged ? 'Cliente' : ''} ${statusChanged ? 'Status' : ''}` };
        }
        return { status: 'duplicate', serial, msg: 'Item já existe sem alterações' };
      }

      await prisma.item.create({
        data: {
          brand: item.brand || 'Genérico',
          model: item.model || 'Padrão',
          type: item.type || 'onu',
          serial: serial,
          assetTag: item.patrimony || `GEN-${Date.now()}-${Math.random()}`,
          city: item.city || 'Nova Maringá',
          status: finalStatus,
          currentHolder: item.clientName,
          currentLocation: finalLocation,
          value: Number(item.value) || 0,
          observations: item.observations,
          history: {
            create: {
              action: "IMPORTACAO",
              description: `Importado via CSV. Cliente: ${item.clientName || 'N/A'}`,
              location: "Sistema"
            }
          }
        }
      });
      return { status: 'added', serial, msg: 'Cadastrado com sucesso' };
    } catch (e) {
      console.log("Erro no item:", item.serial, e.message);
      return { status: 'error', serial: item.serial || '?', msg: e.message };
    }
  }));

  const summary = {
    added: results.filter(r => r.status === 'added').length,
    updated: results.filter(r => r.status === 'updated').length,
    duplicates: results.filter(r => r.status === 'duplicate').length,
    errors: results.filter(r => r.status === 'error').length
  };

  res.json({ success: true, summary, details: results });
});

// --- ROTAS DE CONFIGURAÇÃO (MARCAS/MODELOS) ---

app.get("/api/brands", authenticate, async (req, res) => {
  try {
    const brands = await prisma.brand.findMany({ orderBy: { name: 'asc' } });
    res.json(brands);
  } catch (e) { res.status(500).json({ error: "Erro ao buscar marcas" }); }
});

app.post("/api/brands", authenticate, async (req, res) => {
  try {
    const brand = await prisma.brand.create({ data: { name: req.body.name } });
    res.json(brand);
  } catch (e) { res.status(400).json({ error: "Marca já existe ou erro interno" }); }
});

app.delete("/api/brands/:id", authenticate, async (req, res) => {
  try {
    await prisma.brand.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Erro ao deletar" }); }
});

app.get("/api/models", authenticate, async (req, res) => {
  try {
    const models = await prisma.model.findMany({ orderBy: { name: 'asc' } });
    res.json(models);
  } catch (e) { res.status(500).json({ error: "Erro ao buscar modelos" }); }
});

app.post("/api/models", authenticate, async (req, res) => {
  try {
    const model = await prisma.model.create({ 
      data: { name: req.body.name, brandId: Number(req.body.brandId), type: req.body.type } 
    });
    res.json(model);
  } catch (e) { res.status(400).json({ error: "Erro ao criar modelo" }); }
});

app.delete("/api/models/:id", authenticate, async (req, res) => {
  try {
    await prisma.model.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Erro ao deletar" }); }
});

// --- ROTA DE ESTATÍSTICAS DE EVOLUÇÃO ---
app.get("/api/stats/evolution", authenticate, async (req, res) => {
  try {
    const months = 6;
    const result = [];
    let currentTotal = await prisma.item.count(); // Começa do total atual
    
    const now = new Date();
    
    // Itera de 0 (mês atual) até 5 (5 meses atrás)
    for (let i = 0; i < months; i++) {
      const targetMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      
      const startDate = targetMonth;
      const endDate = i === 0 ? now : nextMonth;
      
      // Busca movimentações neste período para ajustar o saldo
      const [created, deleted] = await prisma.$transaction([
        prisma.history.count({
          where: {
            action: { in: ['CRIACAO', 'IMPORTACAO'] },
            date: { gte: startDate, lt: endDate }
          }
        }),
        prisma.auditLog.count({
          where: {
            action: 'EXCLUIR',
            resource: 'Item',
            createdAt: { gte: startDate, lt: endDate }
          }
        })
      ]);
      
      const monthName = targetMonth.toLocaleString('pt-BR', { month: 'short' });
      const formattedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
      
      // Adiciona ao início do array (para ficar em ordem cronológica)
      result.unshift({ 
        month: formattedMonth, 
        total: currentTotal,
        installed: created,
        removed: deleted
      });
      
      // Calcula o total no início deste período (que é o fim do período anterior)
      currentTotal = currentTotal - created + deleted;
    }
    
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao calcular evolução" });
  }
});

// --- ROTA DE RELATÓRIO DE CONSUMO ---
app.get("/api/reports/consumption", authenticate, async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;
    
    const where = {
      action: 'CONSUMO',
    };

    if (userId) where.userId = Number(userId);
    
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const history = await prisma.history.findMany({
      where,
      include: {
        item: { select: { name: true, serial: true, assetTag: true, unit: true } },
        technician: { select: { name: true } },
        user: { select: { name: true } }
      },
      orderBy: { date: 'desc' }
    });

    const formatted = history.map(h => ({
      id: h.id,
      date: h.date,
      technician: h.user?.name || h.technician?.name || 'Desconhecido',
      item: h.item.name,
      serial: h.item.serial,
      amount: Number(h.description.match(/Consumido (\d+(\.\d+)?)/)?.[1] || 0),
      unit: h.item.unit,
      description: h.description
    }));

    res.json(formatted);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao gerar relatório de consumo" });
  }
});

// --- ROTA GERAL DE HISTÓRICO (Dashboard/Relatórios) ---
app.get("/api/history", authenticate, async (req, res) => {
  try {
    const { limit } = req.query;
    const take = limit ? Number(limit) : 200;

    const history = await prisma.history.findMany({
      take: take, // Aceita limite dinâmico do front
      orderBy: { date: 'desc' },
      include: { item: true, user: true, technician: true }
    });
    
    // Formata para o frontend
    const formatted = history.map(h => ({
      id: h.id,
      date: h.date,
      action: h.action,
      user: h.user?.name || h.technician?.name || 'Sistema', 
      itemSerial: h.item?.serial || 'N/A',
      details: h.description
    }));

    res.json(formatted);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao buscar histórico geral" });
  }
});

// --- ROTA DE HISTÓRICO ---
app.get("/api/items/:id/history", authenticate, async (req, res) => {
  // Nota: O front manda o ID do item, mas as vezes manda o serial.
  // Vamos assumir que o front foi atualizado para mandar o ID numérico do banco, 
  // mas se mandar string, precisamos buscar pelo serial.
  
  const { id } = req.params;
  
  try {
    let item;
    // Tenta achar por ID numérico
    if (!isNaN(id)) {
      item = await prisma.item.findUnique({ 
        where: { id: Number(id) },
        include: { history: { include: { technician: true, user: true }, orderBy: { date: 'desc' } } }
      });
    }
    
    // Se não achou ou id não é numero, tenta serial (fallback para versão antiga do front)
    if (!item) {
      item = await prisma.item.findUnique({ 
        where: { serial: id },
        include: { history: { include: { technician: true, user: true }, orderBy: { date: 'desc' } } }
      });
    }

    if (!item) return res.json([]); // Retorna vazio se não achar

    // Mapeia para o formato que o Front espera
    const historyFormatted = item.history.map(h => ({
      date: h.date,
      action: h.action,
      user: h.user ? h.user.name : (h.technician ? h.technician.name : 'Sistema'),
      details: h.description
    }));

    res.json(historyFormatted);
  } catch (e) {
    res.status(500).json({ error: "Erro history" });
  }
});

// --- ROTA DE AUDITORIA ---
app.get("/api/audit", authenticate, async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, username: true } } }
    });
    res.json(logs);
  } catch (e) { res.status(500).json({ error: "Erro ao buscar logs" }); }
});

// --- ROTA DE BACKUP E STATUS ---
app.get("/api/admin/backup", authenticate, (req, res) => {
  const dbPath = path.join(__dirname, 'prisma/dev.db');
  res.download(dbPath, `backup-mtspeed-${Date.now()}.db`);
});

app.get("/api/admin/backups/auto", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (user?.role?.toLowerCase() !== 'admin') return res.status(403).json({ error: "Acesso negado" });

    const backupDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) return res.json([]);

    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('AUTO-') && f.endsWith('.db'))
      .map(f => {
        const stats = fs.statSync(path.join(backupDir, f));
        return { name: f, size: stats.size, date: stats.mtime };
      })
      .sort((a, b) => b.date - a.date);

    res.json(files);
  } catch (e) { res.status(500).json({ error: "Erro ao listar backups" }); }
});

app.get("/api/admin/backups/auto/:filename", authenticate, async (req, res) => {
  try {
    const filename = req.params.filename;
    if (filename.includes('..') || !filename.startsWith('AUTO-') || !filename.endsWith('.db')) return res.status(400).json({ error: "Arquivo inválido" });

    const filePath = path.join(__dirname, 'backups', filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Arquivo não encontrado" });
    res.download(filePath);
  } catch (e) { res.status(500).json({ error: "Erro ao baixar backup" }); }
});

app.get("/api/admin/stats", authenticate, async (req, res) => {
  const dbPath = path.join(__dirname, 'prisma/dev.db');
  const stats = fs.statSync(dbPath);
  res.json({ dbSize: stats.size });
});

app.post("/api/admin/restore", authenticate, async (req, res) => {
  try {
    // Verifica se é admin
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (user?.role !== 'admin') return res.status(403).json({ error: "Apenas administradores podem restaurar backups." });

    const dbPath = path.join(__dirname, 'prisma/dev.db');
    
    // Desconecta o Prisma para liberar o arquivo (evita erro de arquivo em uso)
    await prisma.$disconnect();
    
    // Sobrescreve o arquivo do banco
    fs.writeFileSync(dbPath, req.body);
    
    res.json({ success: true, message: "Backup restaurado com sucesso!" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao restaurar: " + e.message });
  }
});

// Inicializa servidor e cria admin
initAdmin().then(initRoles).then(ensureDbSchema).then(() => {
  app.listen(3001, () => console.log("🚀 Server PRO rodando na porta 3001"));
});