-- Adiciona a coluna 'source' se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'source'
    ) THEN
        ALTER TABLE transactions ADD COLUMN source TEXT DEFAULT 'manual';
        RAISE NOTICE 'Coluna source adicionada';
    ELSE
        RAISE NOTICE 'Coluna source já existe';
    END IF;
END $$;

-- Adiciona a coluna 'qr_code_id' se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'qr_code_id'
    ) THEN
        ALTER TABLE transactions ADD COLUMN qr_code_id TEXT;
        RAISE NOTICE 'Coluna qr_code_id adicionada';
    ELSE
        RAISE NOTICE 'Coluna qr_code_id já existe';
    END IF;
END $$;