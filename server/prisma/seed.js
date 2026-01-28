const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // 1. Criar Cargos (Roles)
  const roles = [
    { name: 'Administrador', value: 'admin', color: 'purple' },
    { name: 'Técnico', value: 'tecnico', color: 'blue' },
    { name: 'Visualizador', value: 'user', color: 'gray' }
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { value: role.value },
      update: {},
      create: role
    });
  }

  // 2. Criar Admin
  const passwordHash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      name: 'Administrador',
      password: passwordHash,
      role: 'admin',
    },
  });

  // 3. Criar Marcas e Modelos
  const brandsData = [
    { name: 'Huawei', models: ['HG8145V5', 'EG8145V5', 'HG8245H'] },
    { name: 'ZTE', models: ['F670L', 'F601', 'F6600'] },
    { name: 'Intelbras', models: ['1210 Q', 'Action RG 1200', 'Wi-Force W5-1200F'] },
    { name: 'TP-Link', models: ['Archer C6', 'Archer C5', 'EC220-G5'] },
    { name: 'MikroTik', models: ['hEX Lite', 'RB750Gr3', 'RB3011'] }
  ];

  for (const b of brandsData) {
    const brand = await prisma.brand.upsert({
      where: { name: b.name },
      update: {},
      create: { name: b.name }
    });

    for (const mName of b.models) {
      // Verifica se modelo já existe para essa marca
      const existingModel = await prisma.model.findFirst({
        where: { name: mName, brandId: brand.id }
      });

      if (!existingModel) {
        await prisma.model.create({
          data: { name: mName, brandId: brand.id }
        });
      }
    }
  }

  // 4. Configurações Gerais (Fornecedores, etc)
  const defaultConfig = {
    suppliers: ['Fibracem', 'WDC Networks', 'Flytec', 'Local']
  };

  await prisma.systemSetting.upsert({
    where: { id: 'general' },
    update: {},
    create: {
      id: 'general',
      data: JSON.stringify(defaultConfig)
    }
  });

  console.log('✅ Banco de dados populado com sucesso!');
  console.log('🔑 Login: admin / Senha: admin123');
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });