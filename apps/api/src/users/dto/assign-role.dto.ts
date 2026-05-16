import { IsEnum } from 'class-validator';
import { Role } from '@unihub/shared';

export class AssignRoleDto {
  @IsEnum(Role)
  role: Role;
}

export class RemoveRoleDto {
  @IsEnum(Role)
  role: Role;
}
