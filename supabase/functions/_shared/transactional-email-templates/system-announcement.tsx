/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'منظومة إدارة الجودة الشاملة الذكية'

interface SystemAnnouncementProps {
  coordinatorName?: string
  programName?: string
}

const SystemAnnouncementEmail = ({ coordinatorName, programName }: SystemAnnouncementProps) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>تم تفعيل نظام الإشعارات عبر البريد الإلكتروني</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {coordinatorName ? `مرحباً ${coordinatorName}،` : 'مرحباً،'}
        </Heading>

        <Text style={text}>
          يسعدنا إعلامكم بأنه تم <strong>تفعيل نظام الإشعارات عبر البريد الإلكتروني</strong> في {SITE_NAME}.
        </Text>

        <Section style={card}>
          <Text style={label}>ماذا يعني ذلك بالنسبة لكم؟</Text>
          <Text style={value}>
            من الآن فصاعداً، سيصلكم بريد إلكتروني تلقائي على هذا العنوان فور تقديم أي شكوى أو ملاحظة
            تخص {programName ? `برنامج "${programName}"` : 'برنامجكم الأكاديمي'}،
            سواء كانت من طالب أو عضو هيئة تدريس أو موظف.
          </Text>

          <Hr style={hr} />

          <Text style={label}>ماذا يحتوي البريد؟</Text>
          <Text style={value}>
            • موضوع الشكوى وتصنيفها<br />
            • بيانات مقدّم الشكوى (إن وُجدت)<br />
            • وصف تفصيلي للشكوى<br />
            • تاريخ ووقت الإرسال<br />
            • رابط مباشر لمراجعة الشكوى في لوحة التحكم
          </Text>

          <Hr style={hr} />

          <Text style={label}>لماذا هذا مهم؟</Text>
          <Text style={value}>
            يتيح لكم هذا النظام الاستجابة السريعة للشكاوى والملاحظات دون الحاجة لتسجيل الدخول الدوري للمنظومة،
            مما يضمن معالجة فعّالة وشفافة لجميع المخاوف المُثارة.
          </Text>
        </Section>

        <Text style={text}>
          الشكاوى الخاصة ببرامج أخرى لن تصلكم — كل منسق يستلم فقط ما يخص برنامجه.
        </Text>

        <Text style={text}>
          للاستفسار أو الإبلاغ عن أي مشكلة تقنية، يرجى التواصل مع إدارة النظام.
        </Text>

        <Text style={footer}>
          مع خالص التحية،<br />
          فريق {SITE_NAME}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SystemAnnouncementEmail,
  subject: 'تفعيل نظام الإشعارات عبر البريد الإلكتروني — منظومة إدارة الجودة',
  displayName: 'إعلان تفعيل الإشعارات للمنسقين',
  previewData: {
    coordinatorName: 'د. أحمد',
    programName: 'برنامج القانون',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Tahoma, Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '600px', margin: '0 auto' }
const h1 = { fontSize: '20px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#334155', lineHeight: '1.7', margin: '0 0 16px' }
const card = { backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px 20px', margin: '16px 0' }
const label = { fontSize: '13px', color: '#0f172a', margin: '8px 0 4px', fontWeight: 'bold' }
const value = { fontSize: '14px', color: '#334155', margin: '0 0 8px', lineHeight: '1.7' }
const hr = { borderColor: '#e2e8f0', margin: '12px 0' }
const footer = { fontSize: '13px', color: '#64748b', margin: '24px 0 0', lineHeight: '1.6' }
