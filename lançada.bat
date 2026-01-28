@echo off

:: --- BLOCO 1: SERVIDOR (BACKEND) ---
:: Navega para a pasta do servidor
cd /d "C:\Users\MTspeed-03\Desktop\netcontrol-sistema\server"

:: Inicia o servidor (assumindo que o arquivo principal é server.js)
start "NetControl Server" node index.js

:: Espera 2 segundos para dar tempo do servidor subir
timeout /t 2 /nobreak >nul

:: --- BLOCO 2: CLIENTE (FRONTEND) ---
:: Navega para a pasta do cliente
cd /d "C:\Users\MTspeed-03\Desktop\netcontrol-sistema\client"

:: Inicia o Vite/Frontend
start "NetControl Client" npm run dev -- --host

:: Fecha o lançador
exit