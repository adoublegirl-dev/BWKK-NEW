/**
 * 内容安全服务
 * 接入腾讯云内容安全API（TMS）
 * MVP阶段使用文本检测，图片检测预留
 */
const tencentcloud = require('tencentcloud-sdk-nodejs');
const config = require('../config');

const tmsConfig = config.tms;

// 文本内容安全客户端
let textModerationClient = null;

function getClient() {
  if (!tmsConfig.secretId || !tmsConfig.secretKey) {
    console.warn('[ContentSecurity] 腾讯云内容安全密钥未配置，内容审核功能已跳过');
    return null;
  }

  if (!textModerationClient) {
    const TmsClient = tencentcloud.tms.v20201229.Client;
    textModerationClient = new TmsClient({
      credential: {
        secretId: tmsConfig.secretId,
        secretKey: tmsConfig.secretKey,
      },
      region: 'ap-guangzhou',
      profile: {
        httpProfile: { endpoint: 'tms.tencentcloudapi.com' },
      },
    });
  }

  return textModerationClient;
}

/**
 * 文本内容审核
 * @param {string} text - 待审核文本
 * @returns {{ pass: boolean, label?: string, reason?: string }}
 */
const moderateText = async (text) => {
  const client = getClient();

  // 如果未配置密钥，默认通过（开发环境）
  if (!client) {
    return { pass: true };
  }

  try {
    const params = {
      Content: Buffer.from(text).toString('base64'),
    };

    const result = await client.TextModeration(params);

    // Response.Suggestion: Pass(通过) | Review(需人工审核) | Block(违规)
    const suggestion = result.Suggestion;
    const label = result.Label; // 违规类型标签

    if (suggestion === 'Block') {
      return {
        pass: false,
        label: label || 'unknown',
        reason: '内容包含违规信息，请修改后重试',
      };
    }

    if (suggestion === 'Review') {
      return {
        pass: true, // 暂时通过，标记待审核
        label: label || 'review',
        reason: '内容待人工审核',
        needReview: true,
      };
    }

    return { pass: true };
  } catch (error) {
    console.error('[ContentSecurity] 文本审核异常:', error.message);
    // 审核接口异常时默认通过（不阻塞业务）
    return { pass: true, label: 'error', reason: '审核服务暂时不可用' };
  }
};

/**
 * 图片内容审核（预留）
 * @param {string} imageUrl - 图片URL
 * @returns {{ pass: boolean, label?: string, reason?: string }}
 */
const moderateImage = async (imageUrl) => {
  // TODO: 接入腾讯云图片审核 ImageModeration API
  // MVP阶段暂不实现，直接通过
  return { pass: true };
};

/**
 * 批量文本审核
 * @param {string[]} texts - 文本数组
 * @returns {{ results: Array<{ pass: boolean, index: number, label?: string }> }}
 */
const moderateTexts = async (texts) => {
  const results = await Promise.all(
    texts.map(async (text, index) => {
      const result = await moderateText(text);
      return { ...result, index };
    })
  );

  return { results };
};

module.exports = {
  moderateText,
  moderateImage,
  moderateTexts,
};
