export function generateAuraDates(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Set hours to 0 for accurate date comparison
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  // Calculate total days between start and end
  const totalDays = Math.floor((end - start) / (1000 * 60 * 60 * 24));
  
  if (totalDays <= 0) return [start];
  
  const dates = [];
  let current = new Date(start);
  let gap = 1;
  
  // Always add the start date first
  dates.push(new Date(start));
  
  // Calculate next date
  while (current < end) {
    const nextDate = new Date(current);
    nextDate.setDate(nextDate.getDate() + gap);
    nextDate.setHours(0, 0, 0, 0);
    
    if (nextDate >= end) {
      if (dates[dates.length - 1].getTime() !== end.getTime()) {
        dates.push(new Date(end));
      }
      break;
    }
    
    dates.push(new Date(nextDate));
    current = nextDate;
    
    // Progressive gap increase - flexible based on total duration
    if (totalDays <= 10) {
      gap = Math.min(gap + 1, 3); // For short durations, keep gaps smaller
    } else if (totalDays <= 30) {
      gap = Math.min(gap + 1, Math.floor(totalDays / 5));
    } else {
      gap = Math.min(gap + 2, Math.floor(totalDays / 4));
    }
  }
  
  // Ensure we have at least 2 dates
  if (dates.length < 2) {
    const nextDate = new Date(start);
    nextDate.setDate(nextDate.getDate() + 1);
    nextDate.setHours(0, 0, 0, 0);
    if (nextDate <= end) {
      dates.push(nextDate);
    }
  }
  
  return dates;
}

export function formatDate(date) {
  return `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
}
