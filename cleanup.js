const fs = require('fs');
const path = require('path');

// Função auxiliar para deletar arquivos
const deleteFile = (filePath) => {
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`🗑️  Arquivo removido: ${filePath}`);
    } catch (error) {
      console.error(`❌ Erro ao remover ${filePath}:`, error.message);
    }
  }
};

// Função auxiliar para deletar pastas
const deleteFolder = (folderPath) => {
  if (fs.existsSync(folderPath)) {
    try {
      fs.rmSync(folderPath, { recursive: true, force: true });
      console.log(`🗑️  Pasta removida: ${folderPath}`);
    } catch (error) {
      console.error(`❌ Erro ao remover ${folderPath}:`, error.message);
    }
  }
};

console.log("🧹 Iniciando limpeza PROFUNDA do sistema...");

// 1. Arquivos Obsoletos (Refatorações anteriores)
const obsoleteFiles = [
  'client/src/useInventory.js', // Substituído por hooks/useInventory.js
];

obsoleteFiles.forEach(file => deleteFile(path.join(__dirname, file)));

// 2. Arquivos de Log e Temporários (Raiz, Client e Server)
const tempFiles = ['npm-debug.log', 'yarn-error.log', '.DS_Store', 'Thumbs.db'];
['', 'client', 'server'].forEach(folder => {
  tempFiles.forEach(file => deleteFile(path.join(__dirname, folder, file)));
});

// 3. Pastas de Build e Cache (Frontend)
const buildFolders = ['client/dist', 'client/build', 'client/.vite', 'client/node_modules/.vite'];
buildFolders.forEach(folder => deleteFolder(path.join(__dirname, folder)));

// 4. Dependências (node_modules) - Para reinstalação limpa
const dependencyFolders = ['node_modules', 'client/node_modules', 'server/node_modules'];
dependencyFolders.forEach(folder => deleteFolder(path.join(__dirname, folder)));

console.log("✨ Limpeza concluída! Arquivos temporários e obsoletos removidos.");