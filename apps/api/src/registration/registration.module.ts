import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { RegistrationService } from './registration.service';
import { RegistrationController } from './registration.controller';
import { ExpireHoldProcessor } from './expire-hold.processor';
import { WorkshopModule } from '../workshop/workshop.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'expire-hold' }),
    WorkshopModule, // for WorkshopService (publishSeatUpdate)
  ],
  providers: [RegistrationService, ExpireHoldProcessor],
  controllers: [RegistrationController],
  exports: [RegistrationService],
})
export class RegistrationModule {}
