class Card < ApplicationRecord
  require 'cgi'
  include Cards

  has_many :users_cards
  has_many :decks_cards, dependent: :destroy
  has_many :collections_cards

  has_many :users, through: :users_cards
  has_many :decks, through: :decks_cards

  validates :multiverse_id, uniqueness: true
  validates :name, :edition, presence: true

  BASE_URL = "https://cdn1.mtggoldfish.com/images/gf"

  def initialize(**args)
    super(args)
    
    encoded_card_name = card_name_url_encode(args[:name])
    edition_abbreviation = Editions[args[:edition]]

    self.img_url = "#{BASE_URL}/#{encoded_card_name}#{edition_abbreviation}%255D.jpg"
    self.color = args[:colors].size == 1 ? args[:colors].first : args[:colors].size > 1 ? 'Gold' : 'Colorless'
  end

  #double encoding
  def card_name_url_encode(card_name)
    name = I18n.transliterate(card_name)
    CGI.escape(CGI.escape(name)) + "%2B%255B"
  end

  def self.search(search)
    matches = []
    partial_matches = []
    
    Card.where(reprint: false).pluck(:id, :name, :img_url).each do | card_arr |       
      next unless card_arr[1].match?(/#{search}/i)
      
      id, name, img_url = card_arr
      
      return name if name.downcase == search.downcase

      if name.split.any? { | word | word.downcase == search.downcase } 
        matches << card_arr
      else 
        partial_matches << card_arr
      end
    end
    [ matches, partial_matches ].map! { | array | array.sort_by! { | attributes | attributes[1] } } 
  end
  
end