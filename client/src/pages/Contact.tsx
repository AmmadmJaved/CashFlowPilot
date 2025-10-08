import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default function Contact() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-16 px-6">
      <div className="container mx-auto max-w-2xl">
        <h1 className="text-5xl font-bold text-center text-blue-700 mb-10">Contact Us</h1>
        <p className="text-center text-gray-700 dark:text-gray-300 mb-8">
          Have questions or feedback? We’d love to hear from you! Fill out the form below
          and we’ll get back to you as soon as possible.
        </p>

        <form className="space-y-6">
          <Input placeholder="Your Name" required />
          <Input placeholder="Your Email" type="email" required />
          <Textarea placeholder="Your Message" rows={5} required />
          <div className="text-center">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg">
              Send Message
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
