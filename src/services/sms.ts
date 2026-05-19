import { config } from '../config';
import { prisma } from '../utils/prisma';

// Aliyun SMS SDK - will be dynamically imported when credentials are available
let aliyunSmsClient: any = null;

async function getAliyunSmsClient() {
  if (aliyunSmsClient) return aliyunSmsClient;

  if (!config.aliyunSms.accessKeyId || !config.aliyunSms.accessKeySecret) {
    return null;
  }

  try {
    const Dysmsapi = require('@alicloud/dysmsapi20170525');
    const OpenApi = require('@alicloud/openapi-client');
    const Util = require('@alicloud/tea-util');

    const apiConfig = new OpenApi.Config({
      accessKeyId: config.aliyunSms.accessKeyId,
      accessKeySecret: config.aliyunSms.accessKeySecret,
    });
    apiConfig.endpoint = 'dysmsapi.aliyuncs.com';

    aliyunSmsClient = new Dysmsapi.default(apiConfig);
    return aliyunSmsClient;
  } catch (error) {
    console.error('Failed to initialize Aliyun SMS client:', error);
    return null;
  }
}

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export const smsService = {
  /**
   * Send SMS verification code
   * Falls back to test mode (code: 123456) if Aliyun credentials are not configured
   */
  async sendCode(phone: string): Promise<{ success: boolean; message: string }> {
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store code in database
    await prisma.smsCode.create({
      data: {
        phone,
        code,
        expiresAt,
      },
    });

    // Try to send via Aliyun SMS
    const client = await getAliyunSmsClient();

    if (client) {
      try {
        const Dysmsapi = require('@alicloud/dysmsapi20170525');
        const Util = require('@alicloud/tea-util');

        const sendSmsRequest = new Dysmsapi.SendSmsRequest({
          phoneNumbers: phone,
          signName: config.aliyunSms.signName,
          templateCode: config.aliyunSms.templateCode,
          templateParam: JSON.stringify({ code }),
        });

        const runtime = new Util.RuntimeOptions({});
        const result = await client.sendSmsWithOptions(sendSmsRequest, runtime);

        if (result.body.code === 'OK') {
          return { success: true, message: '验证码已发送' };
        } else {
          console.error('Aliyun SMS error:', result.body);
          return { success: false, message: '短信发送失败，请稍后重试' };
        }
      } catch (error) {
        console.error('Aliyun SMS send error:', error);
        return { success: false, message: '短信服务暂时不可用' };
      }
    }

    // Test mode - log code to console
    console.log(`📱 [TEST MODE] SMS code for ${phone}: ${code}`);
    return { success: true, message: '验证码已发送（测试模式）' };
  },

  /**
   * Verify SMS code
   * In test mode, accepts "123456" as a universal code
   */
  async verifyCode(phone: string, code: string): Promise<boolean> {
    // Test mode: accept 123456 as universal code when Aliyun is not configured
    if (!config.aliyunSms.accessKeyId && code === '123456') {
      return true;
    }

    const smsRecord = await prisma.smsCode.findFirst({
      where: {
        phone,
        code,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!smsRecord) {
      return false;
    }

    // Mark as used
    await prisma.smsCode.update({
      where: { id: smsRecord.id },
      data: { used: true },
    });

    return true;
  },
};
