// update-deps.js
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const folders = ['server', 'client'];

console.log("🚀 Verificando e atualizando dependências para a última versão...");

folders.forEach(folder => {
  const folderPath = path.join(__dirname, folder);
  
  if (fs.existsSync(folderPath)) {
    console.log(`\n📦 Processando: ${folder}`);
    try {
      // 1. Atualiza o package.json para as versões mais recentes usando npx
      // O comando 'npx npm-check-updates -u' baixa a ferramenta temporariamente e executa
      console.log(`   - Buscando versões mais recentes...`);
      execSync('npx npm-check-updates -u', { cwd: folderPath, stdio: 'inherit', shell: true });
      
      // 2. Instala as novas dependências
      console.log(`   - Instalando dependências...`);
      execSync('npm install', { cwd: folderPath, stdio: 'inherit', shell: true });
      
      console.log(`✅ ${folder} atualizado com sucesso!`);
    } catch (error) {
      console.error(`❌ Erro ao atualizar ${folder}:`, error.message);
    }
  }
});

console.log("\n✨ Processo finalizado. Teste o sistema para garantir que nada quebrou!");
