import type { JiraIssueData } from './types';

/**
 * Ekstrakcja danych z Jiry
 */

export class JiraExtractor {
  private static $x(xpath: string, context: Document = document): Node | null {
    const result = document.evaluate(
      xpath,
      context,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    );
    return result.singleNodeValue;
  }

  private static getText(element: Node | null): string | null {
    return element ? (element as Element).textContent?.trim() ?? null : null;
  }

  static extractIssueKey(): string | null {
    // Strategy 1: Meta tag
    const metaKey = document.querySelector<HTMLMetaElement>('meta[name="ajs-issue-key"]');
    if (metaKey?.content) return metaKey.content;

    // Strategy 2: From URL
    const urlMatch = window.location.href.match(/\/browse\/([A-Z][A-Z0-9]+-\d+)/);
    if (urlMatch) return urlMatch[1];

    // Strategy 3: XPath
    const keyXPath = this.$x("//a[contains(@id, 'key-val') or contains(@class, 'issue-link') and contains(@href, '/browse/')]");
    if (keyXPath) {
      const match = (keyXPath as Element).textContent?.match(/([A-Z][A-Z0-9]+-\d+)/);
      if (match) return match[1];
    }

    // Strategy 4: From page title
    const titleMatch = document.title.match(/\[([A-Z][A-Z0-9]+-\d+)\]/);
    if (titleMatch) return titleMatch[1];

    return null;
  }

  static extractSummary(): string | null {
    const summaryEl = document.getElementById('summary-val');
    if (summaryEl) return this.getText(summaryEl);

    const h1XPath = this.$x("//h1[@id='summary-val'] | //h1[contains(@class, 'summary')]");
    if (h1XPath) return this.getText(h1XPath);

    const title = document.title;
    const cleanTitle = title.replace(/\[[^\]]+\]\s*/, '').replace(/\s+-\s+JIRA$/, '');
    return cleanTitle || null;
  }

  static extractProject(): string | null {
    const projectLink = document.getElementById('project-name-val');
    if (projectLink) return this.getText(projectLink);

    const projectXPath = this.$x("//a[@id='project-name-val'] | //ol[contains(@class, 'breadcrumb')]//a[contains(@href, '/browse/')]");
    if (projectXPath) return this.getText(projectXPath);

    const issueKey = this.extractIssueKey();
    if (issueKey) return issueKey.split('-')[0];

    return null;
  }

  static parseTimeEstimate(text: string | null): number | null {
    if (!text || text === '-' || text === 'None' || text === 'Not Specified') {
      return null;
    }

    const trimmed = text.trim();
    const pureNumber = parseFloat(trimmed);
    if (!isNaN(pureNumber) && pureNumber >= 0 && !trimmed.match(/[a-z]/i)) {
      return pureNumber;
    }

    let totalHours = 0;
    let hasMatch = false;

    const weeks = trimmed.match(/(\d+(?:\.\d+)?)\s*w(?:eeks?)?/i);
    if (weeks) {
      totalHours += parseFloat(weeks[1]) * 40;
      hasMatch = true;
    }

    const days = trimmed.match(/(\d+(?:\.\d+)?)\s*d(?:ays?)?/i);
    if (days) {
      totalHours += parseFloat(days[1]) * 8;
      hasMatch = true;
    }

    const hours = trimmed.match(/(\d+(?:\.\d+)?)\s*h(?:ours?)?/i);
    if (hours) {
      totalHours += parseFloat(hours[1]);
      hasMatch = true;
    }

    const minutes = trimmed.match(/(\d+(?:\.\d+)?)\s*m(?:in(?:utes?)?)?(?!s)/i);
    if (minutes) {
      totalHours += parseFloat(minutes[1]) / 60;
      hasMatch = true;
    }

    return hasMatch ? totalHours : null;
  }

  static extractEstimatedHours(): number | null {
    const estimateEl = document.getElementById('tt_single_values_orig');
    if (estimateEl) {
      const parsed = this.parseTimeEstimate(this.getText(estimateEl));
      if (parsed !== null) return parsed;
    }

    const xpathPatterns = [
      "//dl[contains(., 'Estimated')]//dd[contains(@class, 'tt_values')]",
      "//dt[contains(text(), 'Estimated') or contains(@id, 'orig')]//following-sibling::dd[1]",
      "//div[@id='timetrackingmodule']//dd[contains(@id, 'orig')]"
    ];

    for (const xpath of xpathPatterns) {
      const el = this.$x(xpath);
      if (el) {
        const parsed = this.parseTimeEstimate(this.getText(el));
        if (parsed !== null) return parsed;
      }
    }

    return null;
  }

  static extractAll(): JiraIssueData | null {
    const issueKey = this.extractIssueKey();
    if (!issueKey) return null;

    return {
      issueKey,
      summary: this.extractSummary() || issueKey,
      project: this.extractProject() || issueKey.split('-')[0],
      url: window.location.href,
      estimatedHours: this.extractEstimatedHours()
    };
  }
}
