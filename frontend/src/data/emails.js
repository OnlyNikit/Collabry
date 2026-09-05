const emails = [
  {
    id: 1,
    sender: "Sarah Johnson",
    email: "sarah@novaai.com",
    subject: "Campaign Collaboration Opportunity",
    snippet:
      "Hi Nikit, we would love to discuss a potential collaboration...",
    time: "2 hours ago",
    unread: true,
    labelId: "clients",
    content: `
Hi Nikit,

We would love to discuss a potential collaboration with you.

Please let us know your availability for a quick discussion.

Best regards,
Sarah Johnson
Nova AI
    `,
  },
  {
    id: 2,
    sender: "Mike Wilson",
    email: "mike@pixelforge.com",
    subject: "Following up on our campaign",
    snippet:
      "Just following up regarding the proposal we sent earlier...",
    time: "5 hours ago",
    unread: true,
    labelId: "follow-up",
    content: `
Hi Nikit,

Just following up regarding the campaign proposal.

Please let us know if you have any questions.

Thanks,
Mike
    `,
  },
  {
    id: 3,
    sender: "TechVision Team",
    email: "hello@techvision.com",
    subject: "Product Review Collaboration",
    snippet:
      "We would like to discuss the content timeline and deliverables...",
    time: "Yesterday",
    unread: false,
    labelId: "clients",
    content: `
Hello Nikit,

We would like to discuss the timeline and deliverables for the
upcoming collaboration.

Regards,
TechVision Team
    `,
  },
  {
    id: 4,
    sender: "Boat Team",
    email: "partnerships@boat.com",
    subject: "Important: Campaign deadline",
    snippet:
      "The deadline for submitting the first draft is approaching...",
    time: "Yesterday",
    unread: true,
    labelId: "important",
    content: `
Hi Nikit,

The deadline for submitting the first draft is approaching.

Please submit the content before the agreed deadline.

Thanks,
Boat Team
    `,
  },
  {
    id: 5,
    sender: "Alex Martin",
    email: "alex@example.com",
    subject: "Need your response",
    snippet:
      "Please check the attached proposal and share your thoughts...",
    time: "Aug 27",
    unread: false,
    labelId: "follow-up",
    content: `
Hi Nikit,

Please check the proposal and share your thoughts when possible.

Regards,
Alex
    `,
  },
];

export default emails;