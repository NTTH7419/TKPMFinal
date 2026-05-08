import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { RegistrationService } from './registration.service';
import { RegistrationController } from './registration.controller';
import { ExpireHoldProcessor } from './expire-hold.processor';
import { WorkshopModule } from '../workshop/workshop.module';
import { LoadProtectionModule } from '../load-protection/load-protection.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'expire-hold' }),
    WorkshopModule,
    LoadProtectionModule,
  ],
  providers: [RegistrationService, ExpireHoldProcessor],
  controllers: [RegistrationController],
  exports: [RegistrationService],
})
export class RegistrationModule {}
