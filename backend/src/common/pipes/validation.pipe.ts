import {
  PipeTransform,
  ArgumentMetadata,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { HttpException } from '@nestjs/common/exceptions/http.exception';

@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  async transform(value: any, metadata: ArgumentMetadata) {
    const { metatype } = metadata;
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToClass(metatype, value);
    const errors = await validate(object);

    if (errors.length > 0) {
      throw new HttpException(
        {
          message: 'The given data was invalid.',
          errors: this.buildError(errors),
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    return value;
  }

  private buildError(errors) {
    const result = {};
    errors.forEach((item) => {
      const { property, constraints } = item;

      result[property] = Object.values(constraints)[0];
    });
    return result;
  }

  private toValidate(metatype): boolean {
    const types = [String, Boolean, Number, Array, Object];
    return !types.find((type) => metatype === type);
  }
}
