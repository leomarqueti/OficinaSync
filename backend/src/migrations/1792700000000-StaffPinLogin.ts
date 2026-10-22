import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Funcionário sem e-mail: entra com celular + PIN (spec 2026-10-21-funcionario-sem-email).
 * users.email/password_hash viram opcionais; os índices únicos de e-mail e celular são FILTRADOS
 * (no SQL Server um UNIQUE comum só aceita um NULL). Nenhum usuário existente muda.
 */
export class StaffPinLogin1792700000000 implements MigrationInterface {
    name = 'StaffPinLogin1792700000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // UNIQUE antigo do e-mail: o nome vem do synchronize antigo, então procura em vez de fixar
        await queryRunner.query(`
            DECLARE @uq sysname = (SELECT kc.name FROM sys.key_constraints kc
                JOIN sys.index_columns ic ON ic.object_id = kc.parent_object_id AND ic.index_id = kc.unique_index_id
                JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
                WHERE kc.parent_object_id = OBJECT_ID('users') AND kc.type = 'UQ' AND c.name = 'email');
            IF @uq IS NOT NULL EXEC('ALTER TABLE "users" DROP CONSTRAINT "' + @uq + '"');`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "email" nvarchar(100) NULL`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "password_hash" varchar(150) NULL`);
        await queryRunner.query(`ALTER TABLE "users" ADD "phone" varchar(20) NULL`);
        await queryRunner.query(`ALTER TABLE "users" ADD "pin_hash" varchar(150) NULL`);
        await queryRunner.query(`ALTER TABLE "users" ADD "failed_pin_attempts" int NOT NULL CONSTRAINT "DF_users_failed_pin_attempts" DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "users" ADD "pin_locked_until" datetime2 NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_users_email" ON "users" ("email") WHERE "email" IS NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_users_phone" ON "users" ("phone") WHERE "phone" IS NOT NULL`);

        await queryRunner.query(`ALTER TABLE "invites" ALTER COLUMN "email" nvarchar(100) NULL`);
        await queryRunner.query(`ALTER TABLE "invites" ADD "phone" varchar(20) NULL`);
        await queryRunner.query(`ALTER TABLE "invites" ADD "name" nvarchar(150) NULL`);
        await queryRunner.query(`ALTER TABLE "invites" ADD "target_user_id" int NULL`);
        await queryRunner.query(`ALTER TABLE "invites" ADD CONSTRAINT "FK_invites_target_user" FOREIGN KEY ("target_user_id") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "invites" DROP CONSTRAINT "FK_invites_target_user"`);
        await queryRunner.query(`ALTER TABLE "invites" DROP COLUMN "target_user_id"`);
        await queryRunner.query(`ALTER TABLE "invites" DROP COLUMN "name"`);
        await queryRunner.query(`ALTER TABLE "invites" DROP COLUMN "phone"`);
        await queryRunner.query(`ALTER TABLE "invites" ALTER COLUMN "email" nvarchar(100) NOT NULL`);

        await queryRunner.query(`DROP INDEX "UQ_users_phone" ON "users"`);
        await queryRunner.query(`DROP INDEX "UQ_users_email" ON "users"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "pin_locked_until"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "DF_users_failed_pin_attempts"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "failed_pin_attempts"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "pin_hash"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "phone"`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "password_hash" varchar(150) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "email" nvarchar(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email")`);
    }
}
