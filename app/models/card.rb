require 'cgi'

class Card < ApplicationRecord
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

    exact_match = Card.find_by(name: search, reprint: false)

    #if user used the autocomplete feature to select an exact match, return the first print of the given card
    return { name: exact_match.name, edition: exact_match.edition } if exact_match

    #otherwise, we check card names against a downcased, Regex-escaped search term ignoring case, skipping card names that don't match at all
    downcased_search = search.downcase
    escaped_search = Regexp.escape(search)
    target = (/#{escaped_search}/i)

    Card.where(reprint: false).pluck(:edition, :name, :img_url).each do | card_arr |
      next unless card_arr[1].match?(target)
      
      edition, name, img_url = card_arr
      
      #return if an exact match has been found where the user's casing didn't match the card's
      return { name: name, edition: edition } if name.downcase == downcased_search

      if name.split.any? { | word | word.downcase == downcased_search } 
        matches << card_arr
      else 
        partial_matches << card_arr
      end
    end
    #return list of full-word and partial-word matches if no exact matches were found
    [ matches, partial_matches ].map! { | array | array.sort_by! { | attributes | attributes[1] } } 
  end
  
end