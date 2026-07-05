import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tests } from './test.entity';
import { CreateTestDto } from './dto/create-test-dto';
import { UpdateTestDto } from './dto/update-test-dto';
import { UsersService } from '../users/users.service';
import { SectionsService } from '../sections/section.service';
import { CarsService } from '../cars/cars.service';

@Injectable()
export class TestsService {
  constructor(
    @InjectRepository(Tests)
    private readonly testsRepository: Repository<Tests>,
    private readonly usersService: UsersService,
    private readonly sectionsService: SectionsService,
    private readonly carsService: CarsService,
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

  /**
   * Testes do mesmo tipo/título já registrados em outros veículos do mesmo
   * modelo (ou no próprio) — pra comparar diagnóstico atual com histórico
   * ("esse Celta 2010 deu 5V na alimentação, esse deu 1.5V").
   */
  async findHistory(
    carId: number,
    userId: number,
    title?: string,
    testType?: string,
  ): Promise<
    {
      test_id: number;
      title: string;
      test_type: string | null;
      measurements: Tests['measurements'];
      data: Tests['data'];
      verdict: string | null;
      notes: string | null;
      created_at: Date;
      service_order_id: number;
      car: { brand: string; model: string; year: number; plate: string };
    }[]
  > {
    const user = await this.usersService.findById(userId);

    if (!user.tenant) {
      throw new UnauthorizedException();
    }

    if (!title?.trim() && !testType?.trim()) {
      return [];
    }

    const car = await this.carsService.findOneScoped(carId, userId);

    const qb = this.testsRepository
      .createQueryBuilder('test')
      .leftJoinAndSelect('test.section', 'section')
      .leftJoinAndSelect('section.serviceOrder', 'serviceOrder')
      .leftJoinAndSelect('serviceOrder.car', 'car')
      .where('car.tenant_id = :tenantId', { tenantId: user.tenant.id })
      .andWhere('car.brand = :brand', { brand: car.brand })
      .andWhere('car.model = :model', { model: car.model })
      .orderBy('test.created_at', 'DESC')
      .take(10);

    if (testType?.trim()) {
      qb.andWhere('test.test_type = :testType', { testType });
    } else if (title?.trim()) {
      qb.andWhere('test.title LIKE :title', { title: `%${title.trim()}%` });
    }

    const tests = await qb.getMany();

    return tests.map((test) => ({
      test_id: test.test_id,
      title: test.title,
      test_type: test.test_type,
      measurements: test.measurements,
      data: test.data,
      verdict: test.verdict,
      notes: test.notes,
      created_at: test.created_at,
      service_order_id: test.section.serviceOrder.service_order_id,
      car: {
        brand: test.section.serviceOrder.car.brand,
        model: test.section.serviceOrder.car.model,
        year: test.section.serviceOrder.car.year,
        plate: test.section.serviceOrder.car.plate,
      },
    }));
  }
}
