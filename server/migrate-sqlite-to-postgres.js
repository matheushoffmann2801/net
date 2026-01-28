const Database = require('better-sqlite3');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

// Inicializa o Prisma (Conectado ao Postgres via .env)
const prisma = new PrismaClient();

// Caminho para o banco SQLite antigo
const sqlitePath = path.join(__dirname, 'prisma', 'dev.db');

async function migrate() {
  console.log(`🚀 Iniciando migração de ${sqlitePath} para PostgreSQL...`);
  
  if (!require('fs').existsSync(sqlitePath)) {
    console.error("❌ Arquivo SQLite não encontrado!");
    process.exit(1);
  }

  const sqlite = new Database(sqlitePath);

  try {
    // 1. Migrar Usuários (User)
    console.log("Migrando Usuários...");
    const users = sqlite.prepare('SELECT * FROM User').all();
    for (const user of users) {
      // Prisma ignora o ID se for autoincrement no Postgres, mas queremos manter os IDs antigos
      // Para isso, precisamos garantir que o ID seja passado explicitamente
      await prisma.user.create({
        data: {
          ...user,
          allowedCities: user.allowedCities || "[]",
          active: user.active === 1, // SQLite usa 1/0 para boolean
          createdAt: new Date(user.createdAt),
          lastLogin: user.lastLogin ? new Date(user.lastLogin) : null
        }
      });
    }
    console.log(`✅ ${users.length} usuários migrados.`);

    // 2. Migrar Marcas (Brand)
    console.log("Migrando Marcas...");
    const brands = sqlite.prepare('SELECT * FROM Brand').all();
    for (const brand of brands) {
      await prisma.brand.create({ data: brand });
    }
    console.log(`✅ ${brands.length} marcas migradas.`);

    // 3. Migrar Modelos (Model)
    console.log("Migrando Modelos...");
    const models = sqlite.prepare('SELECT * FROM Model').all();
    for (const model of models) {
      await prisma.model.create({ data: model });
    }
    console.log(`✅ ${models.length} modelos migrados.`);

    // 4. Migrar Cargos (Role)
    console.log("Migrando Cargos...");
    const roles = sqlite.prepare('SELECT * FROM Role').all();
    for (const role of roles) {
      await prisma.role.create({ data: role });
    }
    console.log(`✅ ${roles.length} cargos migrados.`);

    // 5. Migrar Itens (Item)
    console.log("Migrando Itens (Isso pode demorar)...");
    const items = sqlite.prepare('SELECT * FROM Item').all();
    for (const item of items) {
      await prisma.item.create({
        data: {
          ...item,
          isConsumable: item.isConsumable === 1,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt)
        }
      });
    }
    console.log(`✅ ${items.length} itens migrados.`);

    // 6. Migrar Histórico (History)
    console.log("Migrando Histórico...");
    const history = sqlite.prepare('SELECT * FROM History').all();
    for (const h of history) {
      await prisma.history.create({
        data: {
          ...h,
          date: new Date(h.date)
        }
      });
    }
    console.log(`✅ ${history.length} registros de histórico migrados.`);

    // 7. Migrar Logs de Auditoria (AuditLog)
    console.log("Migrando Auditoria...");
    const logs = sqlite.prepare('SELECT * FROM AuditLog').all();
    for (const log of logs) {
      await prisma.auditLog.create({
        data: {
          ...log,
          createdAt: new Date(log.createdAt)
        }
      });
    }
    console.log(`✅ ${logs.length} logs migrados.`);

    // 8. Migrar Configurações (SystemSetting)
    console.log("Migrando Configurações...");
    const settings = sqlite.prepare('SELECT * FROM SystemSetting').all();
    for (const s of settings) {
      await prisma.systemSetting.create({ data: s });
    }
    console.log(`✅ Configurações migradas.`);

    console.log("\n🎉 Migração concluída com sucesso!");

  } catch (error) {
    console.error("❌ Erro durante a migração:", error);
    // Em caso de erro, recomenda-se limpar o banco Postgres antes de tentar de novo
    console.log("Dica: Rode 'npx prisma migrate reset' no Postgres antes de tentar novamente.");
  } finally {
    await prisma.$disconnect();
    sqlite.close();
  }
}

migrate();