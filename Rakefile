
require 'rake'

desc "install the dot files into user's home directory"
task :install do
  replace_all = false

  Dir['*'].each do |file|
    next if %w[Rakefile README.md].include?(file)

    if File.exist?(File.join(ENV['HOME'], ".#{file}"))
      if replace_all
        replace_file(file)
      else
        print "overwrite ~/.#{file}? [ynaq] "
        case $stdin.gets.chomp
        when 'a'
          replace_all = true
          replace_file(file)
        when 'y'
          replace_file(file)
        when 'q'
          exit
        else
          puts "skipping ~/.#{file}"
        end
      end
    else
      link_file(file)
    end
  end

  puts "Moving utilities to ~/.bin"
  system %Q{rm -rf "$HOME/.bin"}
  system %Q{ln -s "$PWD/bin" "$HOME/.bin"}

  puts 'Moving snippets to ~/.vim/snippets'
  system %Q{rm -rf $HOME/.vim/snippets}
  system %Q{ln -s "$PWD/vim-snippets" "$HOME/.vim/snippets"}
end

def replace_file(file)
  system %Q{rm "$HOME/.#{file}"}
  link_file(file)
end

def link_file(file)
  puts "linking ~/.#{file}"
  system %Q{ln -s "$PWD/#{file}" "$HOME/.#{file}"}
end
