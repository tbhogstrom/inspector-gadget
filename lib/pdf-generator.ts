'use client';

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { AnalysisResult, Issue } from '@/lib/types';

const LOGO_URL = 'https://sfwconstruction.com/wp-content/uploads/2019/12/logo-footer.png';
const CONTACT_URL = 'https://sfwconstruction.com/contact-us/';

const PRIORITY_STYLES: Record<Issue['priority'], { label: string; accent: string; surface: string }> = {
  critical: { label: 'Critical', accent: '#b91c1c', surface: '#fef2f2' },
  major: { label: 'Major', accent: '#c2410c', surface: '#fff7ed' },
  minor: { label: 'Minor', accent: '#a16207', surface: '#fefce8' },
};

function slugifyAddress(address: string | null) {
  if (!address) return 'property';

  return address
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'property';
}

function formatTimestamp(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatDateForFilename(date: Date) {
  return date.toISOString().slice(0, 10);
}

function groupIssuesByPriority(issues: Issue[]) {
  return {
    critical: issues.filter((issue) => issue.priority === 'critical'),
    major: issues.filter((issue) => issue.priority === 'major'),
    minor: issues.filter((issue) => issue.priority === 'minor'),
  };
}

function createIssueCard(doc: Document, issue: Issue) {
  const style = PRIORITY_STYLES[issue.priority];
  const wrapper = doc.createElement('div');
  wrapper.style.border = `1px solid ${style.accent}`;
  wrapper.style.background = style.surface;
  wrapper.style.borderRadius = '12px';
  wrapper.style.padding = '16px';
  wrapper.style.marginBottom = '12px';

  const meta = doc.createElement('div');
  meta.style.display = 'flex';
  meta.style.flexWrap = 'wrap';
  meta.style.gap = '8px';
  meta.style.alignItems = 'center';
  meta.style.marginBottom = '10px';

  const priority = doc.createElement('span');
  priority.textContent = style.label;
  priority.style.display = 'inline-block';
  priority.style.padding = '4px 8px';
  priority.style.borderRadius = '999px';
  priority.style.background = '#ffffff';
  priority.style.border = `1px solid ${style.accent}`;
  priority.style.color = style.accent;
  priority.style.fontSize = '12px';
  priority.style.fontWeight = '700';

  const category = doc.createElement('span');
  category.textContent = issue.category;
  category.style.fontSize = '12px';
  category.style.fontWeight = '600';
  category.style.color = '#334155';

  const location = doc.createElement('span');
  location.textContent = issue.location;
  location.style.fontSize = '12px';
  location.style.color = '#64748b';

  meta.append(priority, category, location);

  if (issue.sfw_relevant && issue.sfw_service) {
    const service = doc.createElement('span');
    service.textContent = `SFW Service: ${issue.sfw_service}`;
    service.style.fontSize = '12px';
    service.style.fontWeight = '600';
    service.style.color = '#1d4ed8';
    meta.append(service);
  }

  const description = doc.createElement('p');
  description.textContent = issue.description;
  description.style.margin = '0 0 8px';
  description.style.fontSize = '14px';
  description.style.lineHeight = '1.6';
  description.style.color = '#0f172a';

  const action = doc.createElement('p');
  action.style.margin = '0';
  action.style.fontSize = '14px';
  action.style.lineHeight = '1.6';
  action.style.color = '#334155';
  const actionLabel = doc.createElement('strong');
  actionLabel.textContent = 'Action: ';
  const actionText = doc.createTextNode(issue.action);
  action.append(actionLabel, actionText);

  wrapper.append(meta, description, action);
  return wrapper;
}

function createSection(doc: Document, title: string, subtitle: string, issues: Issue[]) {
  const section = doc.createElement('section');
  section.style.marginTop = '28px';

  const heading = doc.createElement('h2');
  heading.textContent = title;
  heading.style.margin = '0 0 4px';
  heading.style.fontSize = '20px';
  heading.style.fontWeight = '700';
  heading.style.color = '#0f172a';

  const summary = doc.createElement('p');
  summary.textContent = subtitle;
  summary.style.margin = '0 0 16px';
  summary.style.fontSize = '13px';
  summary.style.color = '#475569';

  section.append(heading, summary);

  const grouped = groupIssuesByPriority(issues);
  (['critical', 'major', 'minor'] as const).forEach((priority) => {
    const items = grouped[priority];
    if (items.length === 0) return;

    const style = PRIORITY_STYLES[priority];
    const groupTitle = doc.createElement('h3');
    groupTitle.textContent = `${style.label} (${items.length})`;
    groupTitle.style.margin = '20px 0 10px';
    groupTitle.style.fontSize = '15px';
    groupTitle.style.fontWeight = '700';
    groupTitle.style.color = style.accent;
    section.append(groupTitle);

    items.forEach((issue) => section.append(createIssueCard(doc, issue)));
  });

  return section;
}

async function loadLogoDataUrl() {
  try {
    const response = await fetch(LOGO_URL, { mode: 'cors' });
    if (!response.ok) return null;
    const blob = await response.blob();

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
          return;
        }
        reject(new Error('Logo conversion failed'));
      };
      reader.onerror = () => reject(new Error('Logo conversion failed'));
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function createPdfFrame() {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.position = 'fixed';
  frame.style.right = '100%';
  frame.style.top = '0';
  frame.style.width = '900px';
  frame.style.height = '1px';
  frame.style.opacity = '0';
  frame.style.pointerEvents = 'none';
  frame.style.border = '0';
  document.body.append(frame);

  const doc = frame.contentDocument;
  if (!doc) {
    frame.remove();
    throw new Error('Failed to prepare PDF document');
  }

  doc.open();
  doc.write('<!doctype html><html><head><meta charset="utf-8"><title>Inspection PDF</title></head><body style="margin:0;background:#ffffff;"></body></html>');
  doc.close();

  return { frame, doc };
}

function buildPdfDocument(doc: Document, result: AnalysisResult, generatedAt: Date, logoDataUrl: string | null) {
  const sfwIssues = result.issues.filter((issue) => issue.sfw_relevant);
  const otherIssues = result.issues.filter((issue) => !issue.sfw_relevant);

  const root = doc.createElement('div');
  root.style.width = '794px';
  root.style.minHeight = '1123px';
  root.style.background = '#ffffff';
  root.style.color = '#0f172a';
  root.style.padding = '40px 44px';
  root.style.fontFamily = 'Arial, Helvetica, sans-serif';
  root.style.boxSizing = 'border-box';
  root.style.lineHeight = '1.4';

  const header = doc.createElement('header');
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'flex-start';
  header.style.gap = '24px';
  header.style.paddingBottom = '24px';
  header.style.borderBottom = '2px solid #e2e8f0';

  const brand = doc.createElement('div');
  if (logoDataUrl) {
    const logo = doc.createElement('img');
    logo.src = logoDataUrl;
    logo.alt = 'SFW Construction logo';
    logo.style.width = '160px';
    logo.style.height = 'auto';
    logo.style.display = 'block';
    logo.style.marginBottom = '10px';
    brand.append(logo);
  }

  const tagline = doc.createElement('p');
  tagline.textContent = 'Exterior Home Repair Experts';
  tagline.style.margin = '0';
  tagline.style.fontSize = '18px';
  tagline.style.fontWeight = '700';
  tagline.style.color = '#1e3a8a';
  brand.append(tagline);

  const meta = doc.createElement('div');
  meta.style.minWidth = '250px';
  meta.style.fontSize = '13px';
  meta.style.lineHeight = '1.7';
  [
    ['Property', result.address ?? 'Not provided'],
    ['Generated', formatTimestamp(generatedAt)],
    ['Total Issues', String(result.issues.length)],
  ].forEach(([label, value]) => {
    const row = doc.createElement('div');
    const strong = doc.createElement('strong');
    strong.textContent = `${label}: `;
    row.append(strong, doc.createTextNode(value));
    meta.append(row);
  });

  header.append(brand, meta);

  const intro = doc.createElement('section');
  intro.style.marginTop = '24px';
  intro.style.padding = '20px';
  intro.style.background = '#eff6ff';
  intro.style.border = '1px solid #bfdbfe';
  intro.style.borderRadius = '16px';

  const introTitle = doc.createElement('h1');
  introTitle.textContent = 'Inspection Analysis Report';
  introTitle.style.margin = '0 0 8px';
  introTitle.style.fontSize = '28px';
  introTitle.style.fontWeight = '800';

  const introText = doc.createElement('p');
  introText.textContent = 'Save this checklist for your next repair planning conversation or contractor walk-through.';
  introText.style.margin = '0';
  introText.style.fontSize = '14px';
  introText.style.lineHeight = '1.6';
  introText.style.color = '#334155';

  intro.append(introTitle, introText);

  const issuesSection = createSection(
    doc,
    'Issues by Priority',
    'All findings from the inspection report grouped from most urgent to least urgent.',
    result.issues,
  );

  const sections = [header, intro, issuesSection];

  if (sfwIssues.length > 0) {
    sections.push(
      createSection(
        doc,
        'SFW Services',
        'Items flagged as work SFW can likely help address.',
        sfwIssues,
      ),
    );
  }

  if (otherIssues.length > 0) {
    sections.push(
      createSection(
        doc,
        'Other Issues',
        'Remaining findings not currently mapped to an SFW service.',
        otherIssues,
      ),
    );
  }

  const footer = doc.createElement('footer');
  footer.style.marginTop = '32px';
  footer.style.paddingTop = '20px';
  footer.style.borderTop = '2px solid #e2e8f0';
  footer.style.display = 'flex';
  footer.style.justifyContent = 'space-between';
  footer.style.gap = '16px';
  footer.style.fontSize = '13px';
  footer.style.color = '#334155';
  const phones = doc.createElement('div');
  [
    ['Portland', '503-476-9460'],
    ['Seattle', '206-203-2046'],
  ].forEach(([label, value]) => {
    const row = doc.createElement('div');
    const strong = doc.createElement('strong');
    strong.textContent = `${label}: `;
    row.append(strong, doc.createTextNode(value));
    phones.append(row);
  });

  const contact = doc.createElement('div');
  contact.style.textAlign = 'right';
  const contactLabel = doc.createElement('div');
  const contactStrong = doc.createElement('strong');
  contactStrong.textContent = 'Contact: ';
  contactLabel.append(contactStrong, doc.createTextNode('sfwconstruction.com/contact-us/'));
  const contactUrl = doc.createElement('div');
  contactUrl.textContent = CONTACT_URL;
  contact.append(contactLabel, contactUrl);

  footer.append(phones, contact);

  root.append(...sections, footer);
  doc.body.append(root);

  return root;
}

export async function downloadInspectionPdf(result: AnalysisResult) {
  const generatedAt = new Date();
  const logoDataUrl = await loadLogoDataUrl();
  const { frame, doc } = createPdfFrame();
  const root = buildPdfDocument(doc, result, generatedAt, logoDataUrl);

  try {
    const canvas = await html2canvas(root, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: root.scrollWidth,
      windowHeight: root.scrollHeight,
    });

    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'pt',
      format: 'a4',
      compress: true,
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const imgData = canvas.toDataURL('image/png');

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const filename = `inspection-report-${slugifyAddress(result.address)}-${formatDateForFilename(generatedAt)}.pdf`;
    pdf.save(filename);

    return { filename };
  } finally {
    frame.remove();
  }
}
