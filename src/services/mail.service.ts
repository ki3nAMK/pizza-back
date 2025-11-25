import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SendEmailCommand, SESClient } from '@aws-sdk/client-ses';
import { MailTemplate } from '@/enums/mail-template.enum';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';

@Injectable()
export class CloudMailService {
  private sesClient: SESClient;

  private mailSubjects: Record<MailTemplate, string> = {
    [MailTemplate.REGISTER]: 'Verify Your Email',
  };

  constructor(private readonly configService: ConfigService) {
    this.sesClient = new SESClient({
      region: this.configService.get('aws.region'),
      credentials: {
        secretAccessKey: this.configService.get('aws.secretAccessKey'),
        accessKeyId: this.configService.get('aws.accessKeyId'),
      },
    });
  }

  private loadTemplate(template: MailTemplate) {
    const filePath = path.join(
      __dirname,
      '..',
      'public',
      'templates',
      `${template}`,
    );

    if (!fs.existsSync(filePath)) {
      console.error('❌ Template not found:', filePath);
      throw new Error(`Template ${template} not found`);
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    return Handlebars.compile(fileContent);
  }

  createSendEmailCommand({
    fromAddress,
    toAddresses,
    ccAddresses = [],
    body,
    subject,
  }) {
    return new SendEmailCommand({
      Destination: {
        ToAddresses: Array.isArray(toAddresses) ? toAddresses : [toAddresses],
        CcAddresses: Array.isArray(ccAddresses) ? ccAddresses : [ccAddresses],
      },
      Message: {
        Body: {
          Html: { Data: body, Charset: 'UTF-8' },
        },
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
      },
      Source: fromAddress,
    });
  }

  async sendVerifyEmail(
    toAddress: string,
    params: {
      fullName: string;
      code: string;
      verificationUrl: string;
      expiresIn: string;
    },
  ) {
    const subject = this.mailSubjects[MailTemplate.REGISTER];

    const templateFn = this.loadTemplate(MailTemplate.REGISTER);
    const body = templateFn(params);

    const command = this.createSendEmailCommand({
      fromAddress: this.configService.get('aws.ses.from'),
      toAddresses: toAddress,
      ccAddresses: [],
      body,
      subject,
    });

    try {
      return await this.sesClient.send(command);
    } catch (err) {
      console.error(`Failed to send email to ${toAddress}`, err);
      throw err;
    }
  }
}
