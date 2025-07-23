import * as OpenCC from 'opencc-js';

// 创建转换器实例
const simplifiedToHongKong = OpenCC.Converter({ from: 'cn', to: 'hk' });
const traditionalToHongKong = OpenCC.Converter({ from: 't', to: 'hk' });

/**
 * 将任何中文文本转换为香港繁体
 * 策略：总是尝试简体到香港繁体的转换，然后再尝试繁体标准化
 * @param text 输入文本
 * @returns 转换后的香港繁体文本
 */
export function convertToHongKongTraditional(text: string): string {
  if (!text || text.trim() === '') {
    return text;
  }
  
  try {
    // 首先尝试简体到香港繁体的转换
    const fromSimplified = simplifiedToHongKong(text);
    
    // 然后对结果进行繁体标准化（处理台湾繁体等变体）
    const fromTraditional = traditionalToHongKong(fromSimplified);
    
    return fromTraditional;
  } catch (error) {
    console.error('Text conversion error:', error);
    // 如果转换失败，返回原文本
    return text;
  }
}

/**
 * 检查文本是否需要转换（即转换前后是否有差异）
 * @param original 原始文本
 * @param converted 转换后文本
 * @returns 是否需要转换
 */
export function needsConversion(original: string, converted: string): boolean {
  return original !== converted && original.trim() !== '' && converted.trim() !== '';
}

/**
 * 检测文本主要包含的字符类型
 * @param original 原始文本
 * @param converted 转换后文本
 * @returns 文本类型说明
 */
function detectTextType(original: string, converted: string): 'simplified' | 'traditional' | 'hongkong' {
  // 如果转换后没有变化，说明已经是香港繁体
  if (original === converted) {
    return 'hongkong';
  }
  
  // 如果有变化，测试是否包含简体字
  const onlySimplifiedConversion = simplifiedToHongKong(original);
  if (onlySimplifiedConversion !== original) {
    return 'simplified';
  } else {
    return 'traditional';
  }
}

/**
 * 获取转换说明文本
 * @param original 原始文本
 * @param converted 转换后文本
 * @returns 说明文本
 */
export function getConversionExplanation(original: string, converted: string): string {
  if (!needsConversion(original, converted)) {
    return '文本已为香港繁体，无需转换';
  }
  
  const textType = detectTextType(original, converted);
  
  switch (textType) {
    case 'simplified':
      return '检测到简体字，已转换为香港繁体';
    case 'traditional':
      return '检测到其他繁体变体，已标准化为香港繁体';
    default:
      return '已转换为香港繁体';
  }
}

/**
 * 批量转换文本数组
 * @param texts 文本数组
 * @returns 转换后的文本数组
 */
export function batchConvertToHongKongTraditional(texts: string[]): string[] {
  return texts.map(text => convertToHongKongTraditional(text));
} 