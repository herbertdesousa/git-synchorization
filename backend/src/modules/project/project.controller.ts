import {
  Body,
  Controller,
  Delete,
  Get,
  ParseUUIDPipe,
  Post,
  Query,
  UnprocessableEntityException,
  BadRequestException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Project as ProjectModel } from '@prisma/client';
import { execSync } from 'child_process';

import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

import { format } from 'date-fns';

import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';

@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  async create(@Body() body: CreateProjectDto): Promise<ProjectModel> {
    const errors = { name: '', path: '' };

    // #region Validation
    if (await this.projectService.findByName(body.name)) {
      errors.name = 'name already in use';
    }

    if (await this.projectService.findByPath(body.path)) {
      errors.path = 'path already in use';
    } else if (!fs.existsSync(body.path)) {
      errors.path = 'path does not exist';
    } else if (fs.existsSync(path.resolve(body.path, '.git'))) {
      errors.path = 'path has git already initializated';
    }

    if (errors.name || errors.path) {
      throw new UnprocessableEntityException({ errors });
    }
    // #endregion

    // #region git && github
    try {
      const repositoryName = `git-synchorization-${body.name}`;
      const response = await axios.post<{ clone_url: string }>(
        'https://api.github.com/user/repos',
        {
          name: repositoryName,
          private: true,
        },
        { headers: { authorization: `Bearer ${process.env.API_GH_KEY}` } },
      );

      execSync(`git init "${body.path}"`);

      execSync(
        `git -C "${body.path}" remote add origin ${response.data.clone_url}`,
      );

      execSync(`git -C "${body.path}" add .`);
      const formattedDate = format(new Date(Date.now()), 'dd MMM yyyy, hh:mm');
      execSync(
        `git -C "${body.path}" commit -m "first-update: ${formattedDate}"`,
      );
      execSync(`git -C "${body.path}" push origin master`);
      // #endregion

      return await this.projectService.create({
        ...body,
        repository_url: response.data.clone_url,
        repository_name: repositoryName,
      });
    } catch (err) {
      throw new BadRequestException(err);
    }
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  @Post('save')
  async saveProjects() {
    const projects = await this.projectService.findAll();

    Promise.all(
      projects.map(async (item) => {
        const hasFileChanges = execSync(
          `git -C "${item.path}" diff --name-only`,
          {
            encoding: 'utf-8',
          },
        );
        if (!hasFileChanges) return;

        execSync(`git -C "${item.path}" add .`);
        const formattedDate = format(
          new Date(Date.now()),
          'dd MMM yyyy, hh:mm',
        );
        execSync(`git -C "${item.path}" commit -m "update: ${formattedDate}"`);
        execSync(`git -C "${item.path}" push origin master`);
      }),
    );
  }

  @Get()
  async find() {
    return await this.projectService.findAll();
  }

  @Delete()
  async delete(
    @Query('id', ParseUUIDPipe) id: string,
    @Query('gh_name') gh_name: string,
  ): Promise<ProjectModel> {
    const project = await this.projectService.delete(id);

    fs.rmdirSync(path.resolve(project.path, '.git'), { recursive: true });

    await axios.delete(
      `https://api.github.com/repos/${gh_name}/${project.repository_name}`,
      { headers: { authorization: `Bearer ${process.env.API_GH_KEY}` } },
    );

    return project;
  }
}
