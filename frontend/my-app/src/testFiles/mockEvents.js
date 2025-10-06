const MOCK_EVENTS = [
  {
    id: 1,
    summary: 'CSE330 Lecture',
    description: 'Concurrency patterns + lab overview',
    location: 'Bryan 115',
    colorId: '2', // green
    eventType: 'lecture',
    start: '2025-10-06T10:00:00-05:00',
    end: '2025-10-06T11:15:00-05:00',
    course_name: 'CSE330',
  },
  {
    id: 2,
    summary: 'HW2 Due',
    description: 'Push to GitHub by 11:59 PM.',
    location: '',
    colorId: '5', // yellow
    eventType: 'assignment',
    start: '2025-10-08T00:00:00-05:00',
    end: '2025-10-08T23:59:00-05:00',
    course_name: 'CSE330',
  },
  {
    id: 3,
    summary: 'Career Fair',
    description: 'Bring copies of your resume.',
    location: 'DUC',
    colorId: '7', // blue
    eventType: 'event',
    start: '2025-10-12T13:00:00-05:00',
    end: '2025-10-12T16:00:00-05:00',
    course_name: null,
  },
  {
    id: 4,
    summary: 'ENG101 Midterm (Take-Home)',
    description: 'Released Fri 9am, due Sun 11:59pm.',
    location: '',
    colorId: '11', // red
    eventType: 'exam',
    start: '2025-10-17T09:00:00-05:00',
    end: '2025-10-19T23:59:00-05:00',
    course_name: 'ENG101',
  },
  {
    id: 5,
    summary: 'Office Hours',
    description: 'Drop in for project questions.',
    location: 'Seigle 212',
    colorId: '1', // purple
    eventType: 'office_hours',
    start: '2025-10-09T14:00:00-05:00',
    end: '2025-10-09T15:30:00-05:00',
    course_name: 'CSE330',
  },
  {
    id: 6,
    summary: 'Lab 4 Check-off',
    description: 'Show working demo to TA.',
    location: 'Lopata Lab',
    colorId: '10', // dark green
    eventType: 'lab',
    start: '2025-10-11T10:30:00-05:00',
    end: '2025-10-11T11:00:00-05:00',
    course_name: 'CSE131',
  },
];

export default MOCK_EVENTS;
