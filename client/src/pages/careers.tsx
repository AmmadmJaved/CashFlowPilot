import React, { useState } from 'react';

const Career = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    position: '',
    message: '',
  });

  const jobListings = [
    {
      id: 1,
      title: 'Software Developer / Requirements Engineer',
      location: 'Vienna, Austria',
      type: 'Full-time',
      description:
        'Join our team to develop and enhance CashPilot software solutions. We are looking for smart minds to strengthen our team.',
      applyLink: 'mailto:ammad.mjaved@gmail.com',
    },
    // Add more job listings as needed
  ];

  const handleChange = (e:any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e:any) => {
    e.preventDefault();
    alert('Application submitted successfully!');
    setFormData({ name: '', email: '', position: '', message: '' });
  };

  return (
    <div className="bg-gray-50 py-16 px-6">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-blue-600 mb-3">Join Our Team</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          We're continuously seeking talented individuals to join our team and contribute to the development of innovative financial solutions.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-16">
        {jobListings.map((job) => (
          <div
            key={job.id}
            className="bg-white shadow-lg rounded-lg p-6 border border-gray-200 hover:shadow-xl transition"
          >
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">{job.title}</h2>
            <p className="text-sm text-gray-500 mb-2">
              📍 {job.location} | {job.type}
            </p>
            <p className="text-gray-600 mb-4">{job.description}</p>
            <a
              href={job.applyLink}
              className="inline-block bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition"
            >
              Apply Now
            </a>
          </div>
        ))}
      </div>

      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-semibold text-blue-600 mb-6">Submit Your Application</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            type="text"
            name="name"
            placeholder="Your Name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="email"
            name="email"
            placeholder="Your Email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            name="position"
            placeholder="Position Applying For"
            value={formData.position}
            onChange={handleChange}
            required
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <textarea
            name="message"
            placeholder="Why do you want to join us?"
            rows={4}
            value={formData.message}
            onChange={handleChange}
            required
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          ></textarea>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition"
          >
            Submit Application
          </button>
        </form>
      </div>
    </div>
  );
};

export default Career;
