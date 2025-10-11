// src/components/FilterBar.tsx
export default function FilterBar(props:{
  from:string; to:string; mood:string; city:string;
  onChange:(p:Partial<{from:string;to:string;mood:string;city:string}>)=>void;
  onClear:()=>void; onApply:()=>void;
  cities?: string[];
}) {
  const {from,to,mood,city,onChange,onClear,onApply,cities = []} = props;

  return (
    <form onSubmit={(e)=>{e.preventDefault(); onApply();}} aria-labelledby="filters-legend">
      <fieldset className="form-card">
        <legend id="filters-legend">Filter Entries</legend>
        <div className="grid">
          <label htmlFor="fromDate">From Date
            <input id="fromDate" name="fromDate" type="date"
              value={from} onChange={e=>onChange({from:e.target.value})} />
          </label>
          <label htmlFor="toDate">To Date
            <input id="toDate" name="toDate" type="date"
              value={to} onChange={e=>onChange({to:e.target.value})} />
          </label>
          <label htmlFor="moodSelect">Mood
            <select id="moodSelect" name="mood"
              value={mood} onChange={e=>onChange({mood:e.target.value})}>
              <option value="">All</option>
              <option value="happy">Happy</option>
              <option value="calm">Calm</option>
              <option value="neutral">Neutral</option>
              <option value="sad">Sad</option>
              <option value="stressed">Stressed</option>
            </select>
          </label>
          <label htmlFor="cityInput">City
            <select id="cityInput" name="city"
              value={city} onChange={e=>onChange({city:e.target.value})} >
              <option value="">All Cities</option>
              {cities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="form-actions" role="group" aria-label="Filter actions">
          <button type="button" className="secondary" onClick={onClear}>Clear</button>
          <button type="submit">Apply Filters</button>
        </div>
      </fieldset>
    </form>
  );
}