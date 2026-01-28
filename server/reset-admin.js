const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Resetando senha do admin...");

  // Criptografa a senha "admin123"
  const hashedPassword = await bcrypt.hash('admin123', 10);

  try {
    // Tenta encontrar e atualizar, ou cria se não existir
    const user = await prisma.user.upsert({
      where: { username: 'admin' },
      update: { 
        password: hashedPassword,
        role: 'admin', // Garante que é admin
        active: true
      },
      create: {
        username: 'admin',
        password: hashedPassword,
        name: 'Administrador',
        role: 'admin',
        active: true
      },
    });

    console.log(`
    ✅ SUCESSO!
    --------------------------------
    Usuário: admin
    Senha:   admin123
    --------------------------------
    Tente logar agora.
    `);
  } catch (e) {
    console.error("❌ Erro ao resetar:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();