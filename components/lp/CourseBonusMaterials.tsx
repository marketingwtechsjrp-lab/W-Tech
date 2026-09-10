import React from 'react';
import { ArrowRight, CheckCircle } from 'lucide-react';
import type { CoursePrice } from '../../lib/coursePricing';
import type { LPLanguage } from '../../lib/lpErgonomiaTranslations';
import './course-bonus-materials.css';

const texts = {
    'pt-BR': {
        eyebrow: 'Seu kit de acerto · incluído no curso', title: 'Da aula para a sua moto.', intro: 'Quatro materiais de apoio para consultar, organizar as regulagens e colocar o aprendizado em prática.',
        names: ['Planilha de regulagem de SAG', 'Planilha de regulagem de PSI', 'Comparativo de óleos', 'Comparativo de molas'],
        descriptions: ['Organize as medições e acompanhe o acerto da suspensão.', 'Registre a pressão dos pneus e consulte seus ajustes.', 'Tenha um material de consulta para comparar óleos.', 'Apoie o estudo e a comparação das molas de suspensão.'],
        rows: [['Piloto / moto', 'Medições', 'Registro de SAG'], ['Terreno', 'Dianteiro / traseiro', 'Pressão registrada'], ['Óleo', 'Características', 'Comparação'], ['Mola', 'Características', 'Comparação']],
        reference: 'Valor atribuído ao material', included: 'Grátis na inscrição', extra: 'de custo adicional', total: 'Valor total dos bônus', bundle: 'Os quatro materiais acompanham o curso.', note: 'Mockups ilustrativos dos materiais de apoio.', cta: 'Quero o curso com os materiais',
    },
    'pt-PT': {
        eyebrow: 'O teu kit de afinação · incluído na formação', title: 'Da aula para a tua mota.', intro: 'Quatro materiais de apoio para consultar, organizar as afinações e pôr a aprendizagem em prática.',
        names: ['Folha de cálculo para o SAG', 'Folha de cálculo para pressão dos pneus', 'Comparação de óleos', 'Comparação de molas'],
        descriptions: ['Organiza as medições e acompanha a afinação da suspensão.', 'Regista a pressão dos pneus e consulta as tuas afinações.', 'Consulta o material de apoio para comparar óleos.', 'Apoia o estudo e a comparação das molas de suspensão.'],
        rows: [['Piloto / mota', 'Medições', 'Registo de SAG'], ['Terreno', 'Dianteiro / traseiro', 'Pressão registada'], ['Óleo', 'Características', 'Comparação'], ['Mola', 'Características', 'Comparação']],
        reference: 'Valor atribuído ao material', included: 'Grátis na inscrição', extra: 'de custo adicional', total: 'Valor total dos bónus', bundle: 'Os quatro materiais acompanham a formação.', note: 'Mockups ilustrativos dos materiais de apoio.', cta: 'Quero a formação com os materiais',
    },
    es: {
        eyebrow: 'Tu kit de ajustes · incluido en el curso', title: 'De la clase a tu moto.', intro: 'Cuatro materiales de apoyo para consultar, organizar los ajustes y poner en práctica lo aprendido.',
        names: ['Hoja de ajuste de SAG', 'Hoja de presión de neumáticos', 'Comparativa de aceites', 'Comparativa de muelles'],
        descriptions: ['Organiza las mediciones de la suspensión.', 'Registra la presión y consulta tus ajustes.', 'Consulta el material para comparar aceites.', 'Apoya el estudio y la comparación de muelles.'],
        rows: [['Piloto / moto', 'Mediciones', 'Registro SAG'], ['Terreno', 'Delantero / trasero', 'Presión'], ['Aceite', 'Características', 'Comparación'], ['Muelle', 'Características', 'Comparación']],
        reference: 'Valor atribuido al material', included: 'Gratis con la inscripción', extra: 'de coste adicional', total: 'Valor total de los bonos', bundle: 'Los cuatro materiales acompañan el curso.', note: 'Mockups ilustrativos de los materiales.', cta: 'Quiero el curso con los materiales',
    },
    en: {
        eyebrow: 'Your setup kit · included in the course', title: 'From the lesson to your bike.', intro: 'Four supporting resources to consult, organize your settings and put your learning into practice.',
        names: ['SAG setup worksheet', 'Tire pressure worksheet', 'Oil comparison guide', 'Spring comparison guide'],
        descriptions: ['Organize your suspension measurements.', 'Record tire pressures and review your settings.', 'Consult the guide to compare oils.', 'Support your study and comparison of suspension springs.'],
        rows: [['Rider / bike', 'Measurements', 'SAG record'], ['Terrain', 'Front / rear', 'Pressure record'], ['Oil', 'Properties', 'Comparison'], ['Spring', 'Properties', 'Comparison']],
        reference: 'Assigned resource value', included: 'Free with enrollment', extra: 'additional cost', total: 'Total bonus value', bundle: 'All four resources are included with the course.', note: 'Illustrative mockups of the supporting resources.', cta: 'Get the course and resources',
    },
};

export function CourseBonusMaterials({ language, price, onOfferClick }: { language: LPLanguage; price: CoursePrice; onOfferClick: () => void }) {
    const t = texts[language];
    const zero = price.currency === 'BRL' ? 'R$ 0' : '0 €';
    return <section id="materiais-inclusos" className="course-bonuses" aria-labelledby="course-bonuses-title">
        <div className="course-bonuses-heading"><p>{t.eyebrow}</p><h2 id="course-bonuses-title">{t.title}</h2><span>{t.intro}</span></div>
        <div className="course-bonuses-grid">
            {t.names.map((name, index) => <article className="course-bonus-card" key={name}>
                <div className={`course-bonus-stage course-bonus-stage-${index}`} aria-hidden="true">
                    <div className="course-bonus-sheet-back" />
                    <div className="course-bonus-sheet">
                        <div className="course-bonus-sheet-brand"><img src="/logo-wtech-branca.webp" alt="" width={76} height={22} loading="lazy" /><span>0{index + 1} / SETUP</span></div>
                        <div className="course-bonus-sheet-title">{name}</div>
                        <div className="course-bonus-sheet-columns"><span>A</span><span>B</span><span>C</span></div>
                        {t.rows[index].map((row, i) => <div className="course-bonus-sheet-row" key={row}><span>{i + 1}</span><strong>{row}</strong><i /><i /></div>)}
                        <div className="course-bonus-sheet-bars"><i /><i /><i /><i /><i /></div>
                    </div>
                    <span className="course-bonus-stage-label">W-TECH · {index < 2 ? 'WORKSHEET' : 'REFERENCE'}</span>
                </div>
                <div className="course-bonus-content"><h3>{name}</h3><p>{t.descriptions[index]}</p>
                    <div className="course-bonus-value"><span>{t.reference}<s>{price.bonusItems[index]}</s></span><strong><CheckCircle size={16} />{t.included}</strong></div>
                    <div className="course-bonus-zero"><b>{zero}</b><span>{t.extra}</span></div>
                </div>
            </article>)}
        </div>
        <p className="course-bonus-disclosure">{t.note}</p>
        <div className="course-bonus-total"><div><span>{t.total}</span><s>{price.bonusValue}</s><p>{t.bundle}</p></div><div className="course-bonus-total-zero"><strong>{zero}</strong><span>{t.extra}</span></div></div>
        <button type="button" className="course-bonus-cta" onClick={onOfferClick}>{t.cta}<ArrowRight size={20} /></button>
    </section>;
}
