import React from 'react';
import { Course } from '../types';
import { Calendar, MapPin, Users, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface CourseCardProps {
  course: Course;
}

const CourseCard: React.FC<CourseCardProps> = ({ course }) => {
  const eventDate = new Date(course.date);
  const day = eventDate.getDate();
  const month = eventDate.toLocaleString('pt-BR', { month: 'short' }).toUpperCase();

  return (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden border border-gray-100 flex flex-col h-full group">
      <div className="relative h-48 overflow-hidden">
        <img 
          src={course.image} 
          alt={course.title} 
          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-4 right-4 bg-wtech-gold text-wtech-black text-xs font-bold px-3 py-1 rounded shadow-md">
          {course.locationType}
        </div>
        <div className="absolute bottom-0 left-0 bg-wtech-black bg-opacity-80 text-white p-2 text-center min-w-[60px]">
          <span className="block text-xl font-bold leading-none">{day}</span>
          <span className="block text-xs font-medium">{month}</span>
        </div>
      </div>
      
      <div className="p-6 flex flex-col flex-grow">
        <div className="flex gap-2 mb-3">
            {course.tags.map(tag => (
                <span key={tag} className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                    {tag}
                </span>
            ))}
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2 leading-tight group-hover:text-wtech-gold transition-colors">
          {course.title}
        </h3>
        <p className="text-gray-500 text-sm mb-4 line-clamp-2">
          {course.description}
        </p>
        
        <div className="mt-auto space-y-3">
            {course.type !== 'Event' && (
                <div className="flex items-center text-gray-500 text-sm">
                    <Users size={16} className="mr-2 text-wtech-gold" />
                    <span>{course.capacity - course.registeredCount} vagas restantes</span>
                </div>
            )}
            <div className="flex items-center text-gray-500 text-sm">
                <MapPin size={16} className="mr-2 text-wtech-gold" />
                <span className="truncate">{course.location}</span>
            </div>
            
            {course.type !== 'Event' && (
                <div className="pt-4 border-t border-gray-100 mt-4">
                    <Link 
                        to={`/lp/${course.slug || course.id}`}
                        className="w-full bg-wtech-black text-white hover:bg-wtech-gold hover:text-wtech-black py-3 rounded-lg flex items-center justify-center text-sm font-bold uppercase tracking-widest transition-all shadow-md active:scale-95"
                    >
                        {course.type === 'Event' ? 'MAIS DETALHES' : 'CONHECER CURSO'} <ArrowRight size={16} className="ml-2 animate-pulse" />
                    </Link>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default CourseCard;