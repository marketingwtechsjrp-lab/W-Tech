# Guia de Migração: Módulo de Certificados e Crachás

Este é um guia passo a passo sobre como importar o módulo de Certificados e Crachás (Student IDs/Badges) para o novo portal.

## 1. Instalar as Dependências

O gerador de PDFs de certificado e verificador de QR Codes dependem de bibliotecas externas. No seu novo projeto, rode:

```bash
npm install jspdf qrcode
npm install @types/jspdf @types/qrcode --save-dev
```

## 2. Estrutura de Diretórios Copiada

Dentro desta pasta de exportação, você encontrará:
- `components/admin/Certificates/`
  - `CertificateGenerator.ts`: A lógica para gerar o PDF baseada nas definições ("layouts") e na lista de cursos/alunos. 
  - `CertificateManagerView.tsx`: A tela do painel Admin feita para criar, gerir dinamicamente e salvar o "layout" do certificado (incluindo arraste de texto, imagem, código QR, etc.).
- `pages/CertificateValidation.tsx`: A página pública usada para o QR Code. Ao scanear um certificado emitido, o usuário é direcionado para ela a fim de validar a autenticidade do documento de matrícula do aluno.
- `sql/create_certificate_layouts.sql`: O modelo estrutural/esquema para gerar a tabela remota de Certificados e Configurações dentro do Supabase.

## 3. Tipos (Adicionar no seu `types.ts` ou arquivo afim)

Copie e insira estas interfaces no arquivo onde estão sendo instanciados os tipos globais:

```typescript
export interface CertificateLayout {
  id: string;
  name: string;
  type: 'Certificate' | 'Badge';
  backgroundUrl: string; // Mapped from background_url
  elements: CertificateElement[];
  dimensions: { width: number, height: number };
  createdAt: string;
}

export interface CertificateElement {
  id: string;
  type: 'Text' | 'Image' | 'QRCode';
  label: string; // For UI identification
  x: number;
  y: number;
  width?: number; // For images/QR
  height?: number; // For images/QR
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  align?: 'left' | 'center' | 'right';
  content: string; // Can controls texts such as: {{student_name}}, {{course_name}}, {{date}}, {{instructor}}, {{enrollment_id}} e {{date_location}}.
  isDynamic?: boolean;
}
```

O `CertificateValidation.tsx`, bem como o `CertificateGenerator.ts` requerem que as entidades `Course` (Cursos) e `Enrollment` (Matrículas) existam e tenham os campos compatíveis:
- **Course**: `title`, `instructor`, `date`, `dateEnd`, `location`, `city`.
- **Enrollment**: `studentName`, `id`.

## 4. Banco de Dados (Supabase)

Acesse o Supabase Web (SQL Editor) do seu novo portal e cole/rode o código presente neste pacote em `sql/create_certificate_layouts.sql`.
Isto construirá a tabela `SITE_CertificateLayouts`.

## 5. Integração na Interface (Admin & Roteamento)

### 5.1 No arquivo de Rotas do Projeto Publico (`App.tsx` ou afim)

Adicione a rota para o leitor de QR Code:

```tsx
import CertificateValidation from './pages/CertificateValidation';

// Nas suas <Routes>
<Route path="/validador/:id" element={<CertificateValidation />} />
```

### 5.2 No arquivo do seu Painel Admin (`Admin.tsx`)

Importe a visualização:
```tsx
import CertificateManagerView from '../components/admin/Certificates/CertificateManagerView';
```

Coloque-a no seu *switch* ou menu de tabs (Menu do Dashboard):
```tsx
{view === 'certificates' && <CertificateManagerView />}
```

### 5.3 Como o Sistema Atua em Outras Views?
Quando você listar a "Turma" e ver a lista de Matrículas do curso, será necessário importar estas funções do Generator para anexar aos botões de **"Imprimir Crachá"** e **"Imprimir Certificados"**.
A lógica original baseia-se num botão que ativa a função:

```tsx
import { generateCertificatesPDF } from '../components/admin/Certificates/CertificateGenerator';

// Ao clicar
const handleGenerateCertificates = async (isBadge = false) => {
    const layout = layouts.find(l => l.id === course.certificateLayoutId); // Obtenha o layout gravado para a referida turma
    // valide se o usuário está confirmado via enrollment
    await generateCertificatesPDF(layout, course, validEnrollments);
};
```
Assim finalizará a implementação funcional.
