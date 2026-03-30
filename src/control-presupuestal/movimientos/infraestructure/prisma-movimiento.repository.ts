import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service'; // Ajusta tu ruta
import { MovimientoRepository } from '../domain/movimiento.repository';
import { MovimientoPresupuesto } from '../entities/movimiento.entity';
import { MovimientoMapper } from '../common/movimiento-mapper';
import {
  MovimientoFiltros,
  PaginatedMovimientos,
} from '../interfaces/interfaces';
import { Prisma } from '@prisma/client';

@Injectable()
export class PrismaMovimientoRepository implements MovimientoRepository {
  private readonly logger = new Logger(PrismaMovimientoRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async save(
    movimiento: MovimientoPresupuesto,
  ): Promise<MovimientoPresupuesto> {
    try {
      const data = MovimientoMapper.toPersistence(movimiento);

      const record = await this.prisma.movimientoPresupuesto.create({
        data,
      });

      return MovimientoMapper.toDomain(record);
    } catch (error) {
      this.logger.error(
        `Error al registrar movimiento financiero: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findByPresupuestoId(
    presupuestoId: number,
  ): Promise<MovimientoPresupuesto[]> {
    try {
      const records = await this.prisma.movimientoPresupuesto.findMany({
        where: { presupuestoId },
        orderBy: { fechaMovimiento: 'desc' },
      });

      return MovimientoMapper.toDomainList(records);
    } catch (error) {
      this.logger.error(
        `Error al buscar movimientos del presupuesto ${presupuestoId}: ${error.message}`,
      );
      throw error;
    }
  }

  async findCompromisoByRequisicion(
    requisicionId: number,
  ): Promise<MovimientoPresupuesto | null> {
    try {
      const record = await this.prisma.movimientoPresupuesto.findFirst({
        where: {
          requisicionId,
          tipoMovimiento: 'COMPROMISO',
        },
      });

      if (!record) return null;

      return MovimientoMapper.toDomain(record);
    } catch (error) {
      this.logger.error(
        `Error al buscar compromiso por requisición ${requisicionId}: ${error.message}`,
      );
      throw error;
    }
  }

  async findForTable(
    filtros: MovimientoFiltros,
  ): Promise<PaginatedMovimientos> {
    const { periodoId, centroCostoId, tipo } = filtros;
    const page = Math.max(filtros.page ?? 1, 1);
    const pageSize = Math.min(filtros.pageSize ?? 20, 100);
    const skip = (page - 1) * pageSize;

    // Construimos el where dinámicamente
    const where: Prisma.MovimientoPresupuestoWhereInput = {
      ...(tipo && { tipoMovimiento: tipo }),
      presupuesto: {
        ...(periodoId && { periodoId }),
        ...(centroCostoId && { centroCostoId }),
      },
    };

    const include = {
      presupuesto: {
        include: {
          partida: true,
          centroCosto: true,
          periodo: true,
        },
      },
      usuario: { select: { id: true, nombre: true } },
      requisicion: { select: { id: true, folio: true } },
      compra: { select: { id: true } },
    };

    try {
      const [records, total] = await this.prisma.$transaction([
        this.prisma.movimientoPresupuesto.findMany({
          where,
          include,
          orderBy: { fechaMovimiento: 'desc' },
          skip,
          take: pageSize,
        }),
        this.prisma.movimientoPresupuesto.count({ where }),
      ]);

      return {
        data: records.map(MovimientoMapper.toTableRow),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    } catch (error) {
      this.logger.error(`Error en findForTable: ${error.message}`);
      throw error;
    }
  }
}
