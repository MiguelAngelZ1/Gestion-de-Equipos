import React from 'react';

const Inventario = () => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Inventario</h1>
        <p className="text-slate-400 mt-1 font-medium">Busca y filtra el stock histórico.</p>
      </div>

      <div className="bg-[#1e293b]/80 backdrop-blur-xl rounded-[2rem] shadow-xl border border-white/10 p-8 text-center text-slate-400 font-medium">
        Esta sección contendrá reportes y filtros avanzados.
      </div>
    </div>
  );
};

export default Inventario;
