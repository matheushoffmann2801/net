import pandas as pd
import os
import sys

# Configurações
INPUT_FILE = '20 - CONTROLE DE ONU - ATUALIZADO.csv'
OUTPUT_FILE = 'estoque_para_importar.csv'

def clean_data():
    if not os.path.exists(INPUT_FILE):
        print(f"❌ Erro: Arquivo '{INPUT_FILE}' não encontrado na pasta raiz.")
        return

    print(f"📂 Lendo arquivo: {INPUT_FILE}...")

    # 1. Leitura e Detecção de Cabeçalho
    # Lê as primeiras linhas para achar onde começa o cabeçalho real
    header_row = 0
    with open(INPUT_FILE, 'r', encoding='latin1') as f:
        for i, line in enumerate(f):
            if 'IDENTIFICA' in line.upper():
                header_row = i
                break
    
    try:
        df = pd.read_csv(INPUT_FILE, encoding='latin1', sep=';', header=header_row, on_bad_lines='skip', dtype=str)
    except Exception as e:
        print(f"❌ Erro ao ler CSV: {e}")
        return

    # Normaliza colunas (Remove espaços e converte para maiúsculo)
    df.columns = [str(c).strip().upper() for c in df.columns]
    
    # Mapeamento dinâmico de colunas
    def get_col(keywords):
        return next((c for c in df.columns if any(k in c for k in keywords)), None)

    col_serial = get_col(['IDENTIFICA', 'SERIAL', 'SN'])
    col_patrimonio = get_col(['PATRIMONIO', 'ATIVO'])
    col_cliente = get_col(['CLIENTE', 'NOME'])
    col_status = get_col(['SITUA', 'STATUS'])
    col_instalado = get_col(['INSTALADO', 'DATA INST'])
    col_retirada = get_col(['RETIRADA', 'DATA RET'])
    col_marca = get_col(['MARCA', 'FABRICANTE'])
    col_modelo = get_col(['MODELO'])

    if not col_serial:
        print("❌ Coluna de Serial/Identificação não encontrada.")
        return

    print("🧹 Processando e limpando dados...")

    # 5. Limpeza: Remove linhas sem serial válido
    df = df.dropna(subset=[col_serial])
    df = df[df[col_serial].str.strip().str.len() > 2] # Remove seriais muito curtos/lixo

    # Converte datas para datetime para ordenação
    def parse_dates(col):
        if col:
            return pd.to_datetime(df[col], dayfirst=True, errors='coerce')
        return pd.Series(pd.NaT, index=df.index)

    df['dt_inst'] = parse_dates(col_instalado)
    df['dt_ret'] = parse_dates(col_retirada)
    
    # Define Data de Referência (A maior data entre instalação e retirada é a data do evento)
    df['dt_ref'] = df[['dt_inst', 'dt_ret']].max(axis=1).fillna(pd.Timestamp('1900-01-01'))

    # 2. Agrupamento e 3. Ordenação
    # Ordena por Serial e Data (mais recente por último)
    df = df.sort_values(by=[col_serial, 'dt_ref'])

    # 4. Definição do Estado Atual (Lógica de Ouro)
    # Agrupa por serial e pega o último registro (tail(1))
    final_rows = []
    
    # Agrupa e itera (mais eficiente que iterrows)
    for serial, group in df.groupby(col_serial):
        last_record = group.tail(1).iloc[0]
        
        # Verifica se a última ocorrência foi uma retirada
        has_retirada = not pd.isna(last_record['dt_ret'])
        
        # Extrai valores
        patrimonio = str(last_record[col_patrimonio]).strip() if col_patrimonio and pd.notna(last_record[col_patrimonio]) else ''
        marca = str(last_record[col_marca]).strip() if col_marca and pd.notna(last_record[col_marca]) else ''
        modelo = str(last_record[col_modelo]).strip() if col_modelo and pd.notna(last_record[col_modelo]) else ''
        data_ref = last_record['dt_ref'].strftime('%Y-%m-%d') if last_record['dt_ref'].year > 1900 else ''

        item = {
            'Serial': str(serial).strip().upper(),
            'Patrimonio': patrimonio.upper(),
            'Marca': marca,
            'Modelo': modelo,
            'Data_Referencia': data_ref
        }

        if has_retirada:
            # Se a última ação foi retirada, voltou para o estoque
            item['Cliente'] = ''
            item['Status'] = 'DISPONIVEL'
        else:
            # Se não tem retirada, mantém o cliente e status da última instalação
            cliente = str(last_record[col_cliente]).strip() if col_cliente and pd.notna(last_record[col_cliente]) else ''
            status_orig = str(last_record[col_status]).strip() if col_status and pd.notna(last_record[col_status]) else ''
            
            item['Cliente'] = cliente
            item['Status'] = status_orig if status_orig else ('EM USO' if cliente else 'DISPONIVEL')

        final_rows.append(item)

    # Cria DataFrame final
    result_df = pd.DataFrame(final_rows)
    
    # Salva CSV limpo
    result_df.to_csv(OUTPUT_FILE, index=False, sep=';', encoding='utf-8-sig')
    
    print(f"\n✅ SUCESSO! Arquivo gerado: {OUTPUT_FILE}")
    print(f"📊 Total de itens únicos consolidados: {len(result_df)}")
    print("👉 Agora faça o upload deste arquivo no sistema.")

if __name__ == "__main__":
    # Verifica se pandas está instalado
    try:
        import pandas
        clean_data()
    except ImportError:
        print("❌ Biblioteca 'pandas' não encontrada.")
        print("Instale rodando: pip install pandas")
