import { Priority } from '@prisma/client'
import { Transform } from 'class-transformer'
import {
	IsArray,
	IsBoolean,
	IsEnum,
	IsOptional,
	IsString
} from 'class-validator'

export class TaskDto {
	@IsString()
	@IsOptional()
	name: string

	@IsBoolean()
	@IsOptional()
	isCompleted?: boolean

	@IsString()
	@IsOptional()
	createdAt?: string

	@IsEnum(Priority)
	@IsOptional()
	@Transform(({ value }) => ('' + value).toLowerCase())
	priority?: Priority

	@IsString()
	@IsOptional()
	category?: string

	@IsArray()
	@IsString({ each: true })
	@IsOptional()
	tags?: string[]

	@IsString()
	@IsOptional()
	parentTaskId?: string
}
