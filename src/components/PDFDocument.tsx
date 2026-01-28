import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { parseContentForPDF, ParsedElement } from '@/lib/content-parser';

// Define styles using Navy/Gold theme
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0A2342', // Navy
    marginBottom: 10,
    borderBottom: '3px solid #FFC300', // Gold
    paddingBottom: 10,
  },
  metadata: {
    fontSize: 10,
    color: '#666666',
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
  },
  metadataRow: {
    marginBottom: 5,
  },
  metadataLabel: {
    fontWeight: 'bold',
  },
  content: {
    fontSize: 12,
    lineHeight: 1.6,
    color: '#333333',
  },
  heading1: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0A2342',
    marginTop: 20,
    marginBottom: 10,
  },
  heading2: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0A2342',
    marginTop: 15,
    marginBottom: 8,
  },
  heading3: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0A2342',
    marginTop: 12,
    marginBottom: 6,
  },
  heading4: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0A2342',
    marginTop: 10,
    marginBottom: 5,
  },
  paragraph: {
    fontSize: 12,
    lineHeight: 1.6,
    marginBottom: 10,
    textAlign: 'justify',
  },
  list: {
    marginBottom: 10,
    marginLeft: 20,
  },
  listItem: {
    fontSize: 12,
    lineHeight: 1.6,
    marginBottom: 5,
    flexDirection: 'row',
  },
  listBullet: {
    width: 15,
  },
  listItemText: {
    flex: 1,
  },
  code: {
    fontSize: 10,
    fontFamily: 'Courier',
    backgroundColor: '#F5F5F5',
    padding: 10,
    marginBottom: 10,
    borderRadius: 4,
    color: '#333333',
  },
  bold: {
    fontWeight: 'bold',
  },
  italic: {
    fontStyle: 'italic',
  },
});

interface PDFDocumentProps {
  title: string;
  category: string;
  tags: string[];
  content: string;
  metadata?: any;
}

export const PDFDocument: React.FC<PDFDocumentProps> = ({
  title,
  category,
  tags,
  content,
  metadata,
}) => {
  // Parse content into structured elements
  const parsedContent = parseContentForPDF(content, metadata);

  // Render a single element
  const renderElement = (element: ParsedElement, index: number): React.ReactElement | null => {
    switch (element.type) {
      case 'heading':
        const headingStyle = element.level === 1 ? styles.heading1 :
                            element.level === 2 ? styles.heading2 :
                            element.level === 3 ? styles.heading3 :
                            styles.heading4;
        return (
          <Text key={index} style={headingStyle}>
            {element.text}
          </Text>
        );

      case 'paragraph':
        return (
          <Text key={index} style={styles.paragraph}>
            {element.text}
          </Text>
        );

      case 'list':
        return (
          <View key={index} style={styles.list}>
            {element.children?.map((item, i) => (
              <View key={i} style={styles.listItem}>
                <Text style={styles.listBullet}>•</Text>
                <Text style={styles.listItemText}>{item.text}</Text>
              </View>
            ))}
          </View>
        );

      case 'code':
        return (
          <Text key={index} style={styles.code}>
            {element.text}
          </Text>
        );

      case 'bold':
        return (
          <Text key={index} style={styles.bold}>
            {element.text}
          </Text>
        );

      case 'italic':
        return (
          <Text key={index} style={styles.italic}>
            {element.text}
          </Text>
        );

      default:
        return (
          <Text key={index} style={styles.paragraph}>
            {element.text}
          </Text>
        );
    }
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Title */}
        <Text style={styles.title}>{title}</Text>

        {/* Metadata */}
        <View style={styles.metadata}>
          <View style={styles.metadataRow}>
            <Text>
              <Text style={styles.metadataLabel}>Category: </Text>
              {category || 'Uncategorized'}
            </Text>
          </View>
          <View style={styles.metadataRow}>
            <Text>
              <Text style={styles.metadataLabel}>Tags: </Text>
              {tags.length > 0 ? tags.join(', ') : 'None'}
            </Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {parsedContent.map((element, index) => renderElement(element, index))}
        </View>
      </Page>
    </Document>
  );
};
