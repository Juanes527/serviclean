import { Module } from '@nestjs/common';
import { WalletModule } from '../wallet/wallet.module';
import { ReportesController } from './reportes.controller';
import { ReportesService } from './reportes.service';
import { ReportesFinancierosService } from './reportes-financieros.service';

@Module({
  imports: [WalletModule],
  controllers: [ReportesController],
  providers: [ReportesService, ReportesFinancierosService],
})
export class ReportesModule {}
