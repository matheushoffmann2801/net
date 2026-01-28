const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const directories = ['server', 'client'];

console.log("🚀 Iniciando instalação completa das dependências...");

directories.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  
  if (fs.existsSync(dirPath)) {
    console.log(`\n📦 Instalando dependências em: ${dir}...`);
    try {
      // Executa npm install e mostra a saída no console
      // 'shell: true' garante compatibilidade com Windows
      execSync('npm install', { cwd: dirPath, stdio: 'inherit', shell: true });
      console.log(`✅ ${dir} instalado com sucesso!`);
    } catch (error) {
      console.error(`❌ Erro ao instalar ${dir}:`, error.message);
    }
  } else {
    console.warn(`⚠️ Diretório não encontrado: ${dir}`);
  }
});

console.log("\n✨ Processo finalizado! Agora você pode iniciar o sistema.");
