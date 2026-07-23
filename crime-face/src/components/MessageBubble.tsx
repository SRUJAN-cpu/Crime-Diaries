import { ChatMessage } from '../api/chatApi';

export function MessageBubble({ role, content }: ChatMessage) {
  const isUser = role === 'user';

  // Helper to check for rich widget keywords in assistant messages
  const lowerContent = content.toLowerCase();
  const showTable = !isUser && (lowerContent.includes('conviction') || lowerContent.includes('rajesh kumar') || lowerContent.includes('silent raja'));
  const showMap = !isUser && (lowerContent.includes('geographic') || lowerContent.includes('hotspot') || lowerContent.includes('fir data'));
  const showNetwork = !isUser && (lowerContent.includes('network diagram') || lowerContent.includes('connections') || lowerContent.includes('associate'));

  return (
    <div className={`flex gap-4 max-w-[90%] mx-auto mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* Assistant Avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-primary flex-shrink-0 flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined text-on-primary text-sm" style={{ fontVariationSettings: '"FILL" 1' }}>
            security
          </span>
        </div>
      )}

      {/* Message Bubble Container */}
      <div className={`max-w-[85%] ${isUser ? '' : 'flex-1'}`}>
        <div
          className={`p-4 text-sm font-body shadow-sm ${
            isUser
              ? 'user-bubble bg-primary-container text-on-primary-container rounded-lg rounded-tr-none border border-primary-container'
              : 'agent-bubble bg-surface text-on-surface rounded-lg rounded-tl-none border border-outline-variant'
          }`}
        >
          {/* Main Content */}
          <div className="whitespace-pre-wrap leading-relaxed">{content}</div>

          {/* Conditional Rendering of Sahara Rich Widgets */}
          {showTable && (
            <div className="mt-4 space-y-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => alert('SQL query: SELECT criminal_id, name, alias, crime_type, convictions FROM criminals WHERE division = "Bangalore North"')}
                  className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded-lg hover:bg-surface-container transition-colors font-label text-xs"
                >
                  <span className="material-symbols-outlined text-sm">terminal</span>
                  SQL Query
                </button>
                <button
                  type="button"
                  className="flex items-center gap-2 px-3 py-1.5 bg-primary text-on-primary rounded-lg hover:opacity-90 transition-colors font-label text-xs shadow-sm"
                >
                  <span className="material-symbols-outlined text-sm">visibility</span>
                  View Results
                </button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto border border-outline-variant rounded-lg bg-white/50">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-surface-container-high font-label text-xs uppercase tracking-wider text-on-surface-variant">
                    <tr>
                      <th className="px-4 py-3 border-b border-outline-variant">Criminal ID</th>
                      <th className="px-4 py-3 border-b border-outline-variant">Name</th>
                      <th className="px-4 py-3 border-b border-outline-variant">Known Aliases</th>
                      <th className="px-4 py-3 border-b border-outline-variant">Primary Crime Type</th>
                      <th className="px-4 py-3 border-b border-outline-variant text-center">Convictions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant text-on-surface">
                    <tr className="hover:bg-primary-fixed/30 transition-colors">
                      <td className="px-4 py-3 font-label text-primary">#KA-9902</td>
                      <td className="px-4 py-3 font-bold">Rajesh Kumar</td>
                      <td className="px-4 py-3 italic text-on-surface-variant">"Silent Raja"</td>
                      <td className="px-4 py-3">Organized Extortion</td>
                      <td className="px-4 py-3 text-center font-bold">04</td>
                    </tr>
                    <tr className="bg-white/30 hover:bg-primary-fixed/30 transition-colors">
                      <td className="px-4 py-3 font-label text-primary">#KA-1244</td>
                      <td className="px-4 py-3 font-bold">Munna Bhai</td>
                      <td className="px-4 py-3 italic text-on-surface-variant">"The Fixer"</td>
                      <td className="px-4 py-3">Land Grabbing</td>
                      <td className="px-4 py-3 text-center font-bold">02</td>
                    </tr>
                    <tr className="hover:bg-primary-fixed/30 transition-colors">
                      <td className="px-4 py-3 font-label text-primary">#KA-4410</td>
                      <td className="px-4 py-3 font-bold">Suresh "Snake"</td>
                      <td className="px-4 py-3 italic text-on-surface-variant">"Nagraj"</td>
                      <td className="px-4 py-3">Illegal Smuggling</td>
                      <td className="px-4 py-3 text-center font-bold">07</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {showMap && (
            <div className="mt-4">
              <div className="relative w-full h-[350px] rounded-lg overflow-hidden border border-outline-variant bg-surface-container-low shadow-inner">
                {/* Simulated Map Background */}
                <div
                  className="absolute inset-0 grayscale contrast-125 opacity-30"
                  style={{
                    backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuC_tHOpWp6i5UkdUgHwPyQNB-5qTMhdZuH4De1zrMf6U_r_FGjnLrbpJM_PAg-zaIcS_flyIerxbVdWO4hJIJAH3R2ik715mXHOab2yxvr1wZ-DYQu5kzf3DDsynfSEz7uY2j9FnPafRcTB2vXE-ODueQHYGj9rpEPR0_cHyI1AOlJYu_mhBAbEHO3z8nmEsiCFYGjagXMQrF4sRtghCmFyGGuCIlSwPDcBRiWYsUMXiN3pu9zTehhTDuQUhXgafs7hzPxDicPyPqmh")',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center center',
                  }}
                />
                
                {/* Hotspots */}
                <div className="absolute top-1/4 left-1/3 w-20 h-20 bg-error opacity-20 blur-2xl rounded-full animate-pulse" />
                <div className="absolute bottom-1/3 right-1/4 w-28 h-28 bg-primary opacity-15 blur-2xl rounded-full animate-pulse" />
                
                {/* Markers */}
                <div className="absolute top-[30%] left-[45%] flex flex-col items-center group cursor-pointer">
                  <span className="material-symbols-outlined text-error text-3xl drop-shadow-md group-hover:scale-110 transition-transform" style={{ fontVariationSettings: '"FILL" 1' }}>
                    location_on
                  </span>
                  <div className="absolute bottom-full mb-1.5 bg-inverse-surface text-inverse-on-surface text-[10px] p-2 rounded-lg whitespace-nowrap shadow-lg opacity-90">
                    <strong className="text-error">High Risk:</strong> Malleshwaram Division<br />3 Recent Incidents
                  </div>
                </div>

                {/* Map Controls */}
                <div className="absolute bottom-4 right-4 flex flex-col gap-0.5">
                  <button type="button" className="w-8 h-8 bg-surface border border-outline-variant flex items-center justify-center hover:bg-surface-container-high transition-colors shadow-sm rounded-t-lg font-bold">+</button>
                  <button type="button" className="w-8 h-8 bg-surface border border-outline-variant flex items-center justify-center hover:bg-surface-container-high transition-colors shadow-sm rounded-b-lg border-t-0 font-bold">-</button>
                </div>

                {/* Legend */}
                <div className="absolute top-4 left-4 bg-surface/95 backdrop-blur-sm p-3 border border-outline-variant rounded-lg shadow-sm">
                  <p className="font-label text-xs font-bold border-b border-outline-variant pb-1 mb-1.5">Security Index</p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 bg-error rounded-full" />
                      <span className="text-[10px] text-on-surface font-body font-medium">High Frequency</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 bg-tertiary-container rounded-full" />
                      <span className="text-[10px] text-on-surface font-body font-medium">Intermediate</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showNetwork && (
            <div className="mt-4">
              <div className="w-full h-[320px] bg-white/50 border border-outline-variant rounded-lg relative overflow-hidden flex items-center justify-center shadow-inner">
                <svg className="w-full h-full" viewBox="0 0 800 350">
                  {/* Links */}
                  <line stroke="#d8d0c8" strokeDasharray="4" strokeWidth="1.5" x1="400" x2="250" y1="175" y2="100" />
                  <line stroke="#c2652a" strokeWidth="2" x1="400" x2="550" y1="175" y2="100" />
                  <line stroke="#d8d0c8" strokeWidth="1.5" x1="400" x2="300" y1="175" y2="280" />
                  <line stroke="#c2652a" strokeWidth="3" x1="400" x2="500" y1="175" y2="280" />
                  
                  {/* Nodes */}
                  <circle cx="400" cy="175" fill="#c2652a" r="38" className="cursor-pointer hover:fill-primary-container transition-colors" />
                  <text fill="#ffffff" fontFamily="Manrope" fontSize="12" fontWeight="bold" textAnchor="middle" x="400" y="179">Rajesh</text>
                  
                  <circle cx="250" cy="100" fill="#f6f0e8" r="24" stroke="#9a9088" className="cursor-pointer" />
                  <text fill="#605850" fontFamily="Manrope" fontSize="10" fontWeight="bold" textAnchor="middle" x="250" y="140">Associate A</text>
                  
                  <circle cx="550" cy="100" fill="#f6f0e8" r="24" stroke="#9a9088" className="cursor-pointer" />
                  <text fill="#605850" fontFamily="Manrope" fontSize="10" fontWeight="bold" textAnchor="middle" x="550" y="140">Suresh "Snake"</text>
                  
                  <circle cx="300" cy="280" fill="#f6f0e8" r="24" stroke="#9a9088" className="cursor-pointer" />
                  <text fill="#605850" fontFamily="Manrope" fontSize="10" fontWeight="bold" textAnchor="middle" x="300" y="320">Associate C</text>
                  
                  <circle cx="500" cy="280" fill="#f6f0e8" r="24" stroke="#9a9088" className="cursor-pointer" />
                  <text fill="#605850" fontFamily="Manrope" fontSize="10" fontWeight="bold" textAnchor="middle" x="500" y="320">Co-defendant D</text>
                </svg>
                
                <div className="absolute top-[38%] left-[55%] bg-surface/90 px-2 py-1 border border-primary-container rounded-lg text-[10px] font-bold text-primary shadow-sm font-label">
                  Frequent Contact
                </div>
                
                <div className="absolute bottom-4 right-4">
                  <button type="button" className="p-2 bg-surface border border-outline-variant rounded-lg hover:bg-surface-container-high transition-colors shadow-sm flex items-center justify-center">
                    <span className="material-symbols-outlined text-sm font-bold">fullscreen</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Timestamp */}
        <div className={`text-[10px] text-on-surface-variant/70 mt-1 font-label ${isUser ? 'text-right' : 'text-left'}`}>
          {isUser ? 'User' : 'Security Assistant'} &bull; Just Now
        </div>
      </div>
    </div>
  );
}
