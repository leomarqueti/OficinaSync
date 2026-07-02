import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tests } from './test.entity';
import { CreateTestDto } from './dto/create-test-dto';
import { UpdateTestDto } from './dto/update-test-dto';
import { UsersService } from '../users/users.service';
import { SectionsService } from '../sections/section.service';

@Injectable()
export class TestsService {
  constructor(
    @InjectRepository(Tests)
    private readonly testsRepository: Repository<Tests>,
    private readonly usersService: UsersService,
    private readonly sectionsService: SectionsService,
  ) {}

  async create(createTestDto: CreateTestDto, userId: number): Promise<Tests> {
    const user = await this.usersService.findById(userId);
    const section = await this.sectionsService.findById(
      createTestDto.section_id,
    );

    if (section.serviceOrder.tenant.id !== user.tenant?.id) {
      throw new ForbiddenException(
        'Essa etapa não pertence ao tenant do usuário.',
      );
    }

    const test = this.testsRepository.create({
      title: createTestDto.title,
      measurements: createTestDto.measurements ?? null,
      test_type: createTestDto.test_type ?? null,
      data: createTestDto.data ?? null,
      verdict: createTestDto.verdict ?? null,
      notes: createTestDto.notes ?? null,
      section,
    });

    return this.testsRepository.save(test);
  }

  async findEntityById(id: number): Promise<Tests> {
    const test = await this.testsRepository.findOne({
      where: { test_id: id },
      relations: {
        section: {
          serviceOrder: {
            tenant: true,
          },
        },
      },
    });

    if (!test) {
      throw new NotFoundException('Teste não encontrado!');
    }

    return test;
  }

  async update(
    testId: number,
    updateTestDto: UpdateTestDto,
    userId: number,
  ): Promise<Tests> {
    const test = await this.findEntityById(testId);
    const user = await this.usersService.findById(userId);

    if (test.section.serviceOrder.tenant.id !== user.tenant?.id) {
      throw new ForbiddenException(
        'Esse teste não pertence ao tenant do usuário.',
      );
    }

    if (updateTestDto.title !== undefined) {
      test.title = updateTestDto.title;
    }

    if (updateTestDto.measurements !== undefined) {
      test.measurements = updateTestDto.measurements;
    }

    if (updateTestDto.test_type !== undefined) {
      test.test_type = updateTestDto.test_type;
    }

    if (updateTestDto.data !== undefined) {
      test.data = updateTestDto.data;
    }

    if (updateTestDto.verdict !== undefined) {
      test.verdict = updateTestDto.verdict;
    }

    if (updateTestDto.notes !== undefined) {
      test.notes = updateTestDto.notes;
    }

    return this.testsRepository.save(test);
  }

  async remove(testId: number, userId: number): Promise<void> {
    const test = await this.findEntityById(testId);
    const user = await this.usersService.findById(userId);

    if (test.section.serviceOrder.tenant.id !== user.tenant?.id) {
      throw new ForbiddenException(
        'Esse teste não pertence ao tenant do usuário.',
      );
    }

    await this.testsRepository.remove(test);
  }
}
