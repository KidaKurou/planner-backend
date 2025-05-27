-- AlterTable
ALTER TABLE "task" ADD COLUMN     "category" TEXT,
ADD COLUMN     "parent_task_id" TEXT,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "time_block" ADD COLUMN     "task_id" TEXT;

-- AddForeignKey
ALTER TABLE "task" ADD CONSTRAINT "task_parent_task_id_fkey" FOREIGN KEY ("parent_task_id") REFERENCES "task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_block" ADD CONSTRAINT "time_block_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
