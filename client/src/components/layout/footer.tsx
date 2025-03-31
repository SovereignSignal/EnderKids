import { HelpCircle, Book, Settings } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-[#333333] text-gray-300 py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <h3 className="text-white text-lg mb-2">EnderKids</h3>
            <p className="text-sm">Making Minecraft agent fun for kids</p>
          </div>
          <div className="flex space-x-6">
            <a href="#" className="hover:text-white transition-colors">
              <HelpCircle className="h-5 w-5" />
            </a>
            <a href="#" className="hover:text-white transition-colors">
              <Book className="h-5 w-5" />
            </a>
            <a href="#" className="hover:text-white transition-colors">
              <Settings className="h-5 w-5" />
            </a>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-gray-700 text-sm text-center">
          <p>&copy; 2025 EnderKids. Not affiliated with Mojang or Microsoft.</p>
        </div>
      </div>
    </footer>
  );
}
