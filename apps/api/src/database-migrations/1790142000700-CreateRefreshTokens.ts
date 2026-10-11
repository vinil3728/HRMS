import {
    MigrationInterface,
    QueryRunner,
} from 'typeorm';

export class CreateRefreshTokens1790142000700
    implements MigrationInterface
{
    name =
        'CreateRefreshTokens1790142000700';

    public async up(
        queryRunner: QueryRunner,
    ): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "refresh_tokens" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),

                "user_id" uuid NOT NULL,

                "token_hash"
                    character varying(64) NOT NULL,

                "expires_at"
                    TIMESTAMP NOT NULL,

                "revoked_at"
                    TIMESTAMP,

                "created_at"
                    TIMESTAMP NOT NULL DEFAULT now(),

                CONSTRAINT "PK_refresh_tokens_id"
                    PRIMARY KEY ("id"),

                CONSTRAINT "UQ_refresh_tokens_token_hash"
                    UNIQUE ("token_hash"),

                CONSTRAINT "FK_refresh_tokens_user"
                    FOREIGN KEY ("user_id")
                    REFERENCES "users"("id")
                    ON DELETE CASCADE
                    ON UPDATE NO ACTION
            )
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_refresh_tokens_user_id"
            ON "refresh_tokens" ("user_id")
        `);
    }

    public async down(
        queryRunner: QueryRunner,
    ): Promise<void> {
        await queryRunner.query(`
            DROP INDEX "IDX_refresh_tokens_user_id"
        `);

        await queryRunner.query(`
            DROP TABLE "refresh_tokens"
        `);
    }
}