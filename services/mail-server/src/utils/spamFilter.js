/**
 * Simple spam detection algorithm
 * Scores emails based on various spam indicators
 */

export class SpamFilter {
  constructor() {
    // Spam keywords and their weights
    this.spamKeywords = {
      // Common spam phrases
      'viagra': 5,
      'cialis': 5,
      'lottery': 4,
      'winner': 3,
      'congratulations': 2,
      'click here': 3,
      'free money': 5,
      'nigerian prince': 5,
      'inheritance': 4,
      'urgent': 2,
      'act now': 3,
      'limited time': 2,
      'casino': 4,
      'bitcoin': 2,
      'cryptocurrency': 2,
      'investment opportunity': 3,
      'guaranteed': 3,
      'no risk': 4,
      'weight loss': 3,
      'enlarge': 4,
      'unsubscribe': 1,
      'opt out': 1,
      'confirm your account': 2,
      'verify your account': 2,
      'suspended account': 3,
      'unusual activity': 2
    };

    // Suspicious patterns
    this.suspiciousPatterns = [
      /\d{4,}/g,  // Long numbers (card numbers, etc.)
      /(\$|€|£|¥)\s*\d+/g,  // Money amounts
      /https?:\/\/[^\s]+/g,  // URLs
      /[A-Z]{5,}/g,  // EXCESSIVE CAPS
      /!{3,}/g,  // Multiple exclamation marks!!!
      /click\s+here/gi,  // Click here phrases
    ];
  }

  /**
   * Analyze email and return spam score (0-100)
   * Higher score = more likely to be spam
   */
  analyzeEmail(emailData) {
    let score = 0;
    const {from_address, subject = '', body_text = '', body_html = ''} = emailData;
    const combinedText = `${subject} ${body_text}`.toLowerCase();

    // 1. Check for spam keywords
    for (const [keyword, weight] of Object.entries(this.spamKeywords)) {
      const regex = new RegExp(keyword, 'gi');
      const matches = combinedText.match(regex);
      if (matches) {
        score += weight * matches.length;
      }
    }

    // 2. Check for suspicious patterns
    this.suspiciousPatterns.forEach(pattern => {
      const matches = combinedText.match(pattern);
      if (matches) {
        score += matches.length * 2;
      }
    });

    // 3. Check for excessive capitalization
    const capsRatio = (subject.match(/[A-Z]/g) || []).length / subject.length;
    if (capsRatio > 0.5 && subject.length > 10) {
      score += 10;
    }

    // 4. Check for suspicious sender
    if (this.isSuspiciousSender(from_address)) {
      score += 15;
    }

    // 5. Check for too many links
    const linkMatches = combinedText.match(/https?:\/\//g);
    if (linkMatches && linkMatches.length > 5) {
      score += linkMatches.length * 3;
    }

    // 6. Check for short email with many caps/exclamations
    if (combinedText.length < 100) {
      const specialChars = (combinedText.match(/[!?]{2,}/g) || []).length;
      score += specialChars * 5;
    }

    // 7. Empty subject penalty
    if (!subject || subject.trim().length === 0) {
      score += 5;
    }

    // Normalize score to 0-100
    score = Math.min(score, 100);

    return {
      score,
      isSpam: score >= 50,  // Threshold for spam
      isSuspicious: score >= 30 && score < 50,  // Suspicious but not definite spam
      reason: this.getSpamReason(score)
    };
  }

  isSuspiciousSender(email) {
    // Check for suspicious sender patterns
    const suspiciousPatterns = [
      /@.*\.ru$/i,  // Russian domains (common in spam)
      /@.*\.cn$/i,  // Chinese domains
      /noreply@/i,
      /admin@/i,
      /support@[^a-z]/i,
      /\d{5,}/,  // Emails with many numbers
      /[a-z]{20,}/i,  // Very long random strings
    ];

    return suspiciousPatterns.some(pattern => pattern.test(email));
  }

  getSpamReason(score) {
    if (score >= 75) return 'High spam probability - multiple spam indicators';
    if (score >= 50) return 'Likely spam - contains spam keywords/patterns';
    if (score >= 30) return 'Suspicious - some spam characteristics';
    return 'Appears legitimate';
  }

  /**
   * Train the filter with user feedback (for future enhancement)
   */
  learn(emailData, isSpam) {
    // TODO: Implement machine learning-based training
    // For now, this is a placeholder for future enhancement
    console.log(`Learning from feedback: ${isSpam ? 'spam' : 'ham'}`);
  }
}

export default new SpamFilter();
