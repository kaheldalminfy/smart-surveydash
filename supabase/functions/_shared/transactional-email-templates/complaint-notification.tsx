/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Hr, Button,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'منظومة إدارة الجودة الشاملة الذكية'

interface ComplaintNotificationProps {
  coordinatorName?: string
  programName?: string
  complainantName?: string
  complainantType?: string
  category?: string
  subject?: string
  description?: string
  submittedAt?: string
  complaintUrl?: string
}

const ComplaintNotificationEmail = ({
  coordinatorName,
  programName,
  complainantName,
  complainantType,
  category,
  subject,
  description,
  submittedAt,
  complaintUrl,
}: ComplaintNotificationProps) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>
      {`شكوى/ملاحظة جديدة${programName ? ` - ${programName}` : ''}`}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {coordinatorName ? `مرحباً ${coordinatorName}،` : 'مرحباً،'}
        </Heading>
        <Text style={text}>
          تم استلام شكوى/ملاحظة جديدة تخص
          {programName ? ` برنامج "${programName}"` : ' برنامجكم'}
          {' '}وتحتاج إلى مراجعتكم.
        </Text>

        <Section style={card}>
          {subject && (
            <>
              <Text style={label}>الموضوع</Text>
              <Text style={value}>{subject}</Text>
            </>
          )}
          {category && (
            <>
              <Text style={label}>التصنيف</Text>
              <Text style={value}>{category}</Text>
            </>
          )}
          {complainantName && (
            <>
              <Text style={label}>مقدّم الشكوى</Text>
              <Text style={value}>
                {complainantName}
                {complainantType ? ` (${complainantType})` : ''}
              </Text>
            </>
          )}
          {submittedAt && (
            <>
              <Text style={label}>تاريخ الإرسال</Text>
              <Text style={value}>{submittedAt}</Text>
            </>
          )}
          {description && (
            <>
              <Hr style={hr} />
              <Text style={label}>الوصف</Text>
              <Text style={value}>{description}</Text>
            </>
          )}
        </Section>

        {complaintUrl && (
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button href={complaintUrl} style={button}>
              عرض الشكوى في لوحة التحكم
            </Button>
          </Section>
        )}

        <Text style={footer}>
          هذه رسالة تلقائية من {SITE_NAME}. الرجاء عدم الرد على هذا البريد.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ComplaintNotificationEmail,
  subject: (d: Record<string, any>) =>
    `شكوى جديدة${d?.programName ? ` - ${d.programName}` : ''}${d?.subject ? `: ${d.subject}` : ''}`,
  displayName: 'إشعار شكوى للمنسق',
  previewData: {
    coordinatorName: 'د. أحمد',
    programName: 'برنامج القانون',
    complainantName: 'طالب',
    complainantType: 'طالب',
    category: 'أكاديمية',
    subject: 'مثال على موضوع الشكوى',
    description: 'تفاصيل الشكوى تظهر هنا.',
    submittedAt: new Date().toLocaleString('ar'),
    complaintUrl: 'https://quality-hss.ly/complaints',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Tahoma, Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '600px', margin: '0 auto' }
const h1 = { fontSize: '20px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#334155', lineHeight: '1.7', margin: '0 0 16px' }
const card = { backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px 20px', margin: '16px 0' }
const label = { fontSize: '12px', color: '#64748b', margin: '8px 0 2px', fontWeight: 'bold' }
const value = { fontSize: '14px', color: '#0f172a', margin: '0 0 8px', lineHeight: '1.6' }
const hr = { borderColor: '#e2e8f0', margin: '12px 0' }
const button = { backgroundColor: '#0f172a', color: '#ffffff', padding: '12px 24px', borderRadius: '6px', textDecoration: 'none', fontSize: '14px', fontWeight: 'bold' }
const footer = { fontSize: '12px', color: '#94a3b8', margin: '24px 0 0', textAlign: 'center' as const }
