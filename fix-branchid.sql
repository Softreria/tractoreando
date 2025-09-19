-- Verificar si la columna branchId existe
SELECT column_name FROM information_schema.columns WHERE table_name = 'Vehicles' AND column_name = 'branchId';

-- Agregar la columna branchId si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Vehicles' AND column_name = 'branchId'
    ) THEN
        ALTER TABLE "Vehicles" ADD COLUMN "branchId" VARCHAR(255);
        ALTER TABLE "Vehicles" ADD CONSTRAINT "fk_vehicles_branchid" 
            FOREIGN KEY ("branchId") REFERENCES "Branches"("id");
        RAISE NOTICE 'Columna branchId agregada exitosamente';
    ELSE
        RAISE NOTICE 'Columna branchId ya existe';
    END IF;
END $$;

-- Verificar el resultado
SELECT column_name FROM information_schema.columns WHERE table_name = 'Vehicles' AND column_name = 'branchId';
