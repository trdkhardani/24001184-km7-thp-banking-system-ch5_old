-- CreateEnum
CREATE TYPE "Roles" AS ENUM ('admin', 'customer');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "role" "Roles" NOT NULL DEFAULT 'customer';
