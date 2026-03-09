// infraestructure/prisma-plantilla-legal.repository.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PlantillaLegalRepository } from '../domain/plantilla-legal.repository';
import { PlantillaLegalCredito } from '../entities/plantilla-legal-credito.entity';
import { CreatePlantillaLegalCreditoDto } from '../dto/create-plantilla-legal-credito.dto';
import { UpdatePlantillaLegalCreditoDto } from '../dto/update-plantilla-legal-credito.dto';
import { PlantillaLegalMapper } from '../common/mapper';

@Injectable()
export class PrismaPlantillaLegal implements PlantillaLegalRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreatePlantillaLegalCreditoDto,
  ): Promise<PlantillaLegalCredito> {
    const entity = PlantillaLegalMapper.fromCreateDto(dto);
    const raw = await this.prisma.plantillaLegal.create({
      data: entity.toPrismaCreate(),
    });
    return PlantillaLegalCredito.fromPrisma(raw);
  }

  async update(
    id: number,
    dto: UpdatePlantillaLegalCreditoDto,
  ): Promise<PlantillaLegalCredito> {
    await this.findOrFail(id);
    const entity = PlantillaLegalMapper.fromUpdateDto(dto);
    const raw = await this.prisma.plantillaLegal.update({
      where: { id },
      data: entity.toPrismaUpdate(),
    });
    return PlantillaLegalCredito.fromPrisma(raw);
  }

  async delete(id: number): Promise<void> {
    await this.findOrFail(id);
    await this.prisma.plantillaLegal.delete({ where: { id } });
  }

  async findAll(): Promise<PlantillaLegalCredito[]> {
    const rows = await this.prisma.plantillaLegal.findMany({
      orderBy: { creadoEn: 'desc' },
    });
    return rows.map(PlantillaLegalCredito.fromPrisma);
  }

  async findById(id: number): Promise<PlantillaLegalCredito | null> {
    const raw = await this.prisma.plantillaLegal.findUnique({ where: { id } });
    return raw ? PlantillaLegalCredito.fromPrisma(raw) : null;
  }

  private async findOrFail(id: number) {
    const exists = await this.prisma.plantillaLegal.findUnique({
      where: { id },
    });
    if (!exists)
      throw new NotFoundException(`PlantillaLegal #${id} no encontrada`);
  }
}
