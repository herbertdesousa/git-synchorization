import { Injectable } from '@nestjs/common';

import { Prisma, Project as ProjectModel } from '@prisma/client';
import { PrismaService } from 'src/common/modules/prisma/prisma.service';

@Injectable()
export class ProjectService {
  constructor(private readonly prismaService: PrismaService) {}

  async findByName(name: string): Promise<ProjectModel | undefined> {
    return this.prismaService.project.findFirst({ where: { name } });
  }

  async findByPath(path: string): Promise<ProjectModel | undefined> {
    return this.prismaService.project.findFirst({ where: { path } });
  }

  async create(data: Prisma.ProjectCreateInput): Promise<ProjectModel> {
    return this.prismaService.project.create({ data });
  }

  async findAll(): Promise<ProjectModel[]> {
    return this.prismaService.project.findMany();
  }

  async delete(id: string): Promise<ProjectModel> {
    return this.prismaService.project.delete({ where: { id } });
  }
}
