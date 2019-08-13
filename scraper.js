function scrapeHighlights(sp_docToScrape) {
    var reformatedJSON;

    if (sp_docToScrape.querySelector('.bodyContainer')) {
        reformatedJSON = sp_KindleScraper.getHighlights(sp_docToScrape);
    }
    else {
        reformatedJSON = sp_IbookScraper.getHighlights(sp_docToScrape);
    } 

    // Templating and dom manipulation

    var sp_navHTML = '';
    var sectionHTML = '',
    sp_sectionEl = document.createElement('article');
    sp_sectionEl.classList.add('sp_highlights');

    reformatedJSON.sections.forEach((section, curr) => {
        sp_navHTML += `<li id="#sp_section${curr+1}-toc">${section.sectionTitle}&nbsp;(${section.noteCount})</li>`;
        
        sectionHTML += `<section class="sp_section" id="sp_section${curr+1}">`;
        sectionHTML += `<h2 class="sp_section-title">${section.sectionTitle} (${section.noteCount})</h2>`;

        section.notes.forEach((note) => {
            var noteHTML = 
            `<p class="sp_note sp_note--${note.level} sp_note--${note.type}">
            <span class="sp_note-level">&bull;</span> ${note.text}
            <span class="sp_note-location">&mdash;Location: <span class="sp_note-location__value">${note.location}</span></span>
            </p>`;
            sectionHTML += noteHTML;
        });
        sectionHTML += '</section>';
    });

    var sp_header = document.createElement('header');
    sp_header.innerHTML = '<h1 class="sp_title"></h1><p class="sp_author"></p><ol class="sp_toc"></ol>';
    sp_header.querySelector('.sp_title').innerText = reformatedJSON.title; 
    sp_header.querySelector('.sp_author').innerText = 'by: ' + reformatedJSON.authors;
    sp_header.querySelector('.sp_toc').innerHTML = sp_navHTML;
    sp_sectionEl.innerHTML = sectionHTML;

    sp_sectionEl.insertBefore(sp_header, sp_sectionEl.firstChild);
    document.querySelector('body').append(sp_sectionEl);
}
/**
 *  Works with export of Kindle Highlights with the follwoing DOM structure:
 * 
 *  body
 *   .bodyContainer
 *   .notebookFor
 *   .bookTitle
 *   .authors
 *   .citation
 *   .sectionHeading
 *   .noteHeading
 *       .highlight_yellow
 *   .noteText
 *   .noteHeading
 *       .highlight_yellow
 *   .noteText
 *   .
 *   .
 *   .
 *  .sectionHeading
 * 
 * getHighlights method expects a document element from an exported html of Kindle highlights
 * and returns a json 
 */
const sp_KindleScraper = (function(){
    
    var scrapedHighlights,
        scrapedHighlightsArray,
        cleanScrapedHighlights,
        sectionsWithHighlights,
        metaSection,
        docJSON = {
            "authors": undefined,
            "title": undefined,
            "sections": []
        },
        sectionIndexes = [];
    
    /**
     * 
     * @param {*} docToScrape document element from the html export of Kindle highlights
     * 
     * @return               {
     *                          "authors": String,
     *                          "title": String,
     *                          "sections": [
     *                               {
     *                                   "sectionTitle": String,
     *                                   "noteCount": Number,
     *                                   "notes": [
     *                                       {
     *                                           "type": String,
     *                                           "location": String,
     *                                           "level": String,
     *                                           "text": String
     *                                       }
     *                                   ]  
     *                               }
     *                           ]
     *                      }
     */
    function getHighlights(docToScrape) {
        /** 
         * NodeLists are array-like but don't feature many of the methods provided by the Array, 
         * like forEach, map, filter, etc.
         * 
         * a very simple way to convert NodeLists to Arrays:
         *   
         *   var nodesArray = Array.prototype.slice.call(document.querySelectorAll("div"));
         * 
         * https://davidwalsh.name/nodelist-array
         */ 
        scrapedHighlights = docToScrape.querySelector('.bodyContainer').childNodes;
        scrapedHighlightsArray = Array.prototype.slice.call(scrapedHighlights); // a very simple way to convert NodeLists to Arrays
        cleanScrapedHighlights = sp_Util.removeWhiteSpace(scrapedHighlightsArray);
        sectionIndexes = getSectionIndexes(cleanScrapedHighlights);
        sectionsWithHighlights = splitIntoSections(cleanScrapedHighlights, sectionIndexes);
        metaSection = getScrapedMetaArray(cleanScrapedHighlights, sectionIndexes);

        docJSON.sections = buildSectionJSON(sectionsWithHighlights);
        docJSON.authors = getAuthor(metaSection);
        docJSON.title = getTitle(metaSection);

        return docJSON;
    }

    /**
     * Find sections in the scraped document node list
     * 
     * @param nodeArray An array of cleaned nodes/elements of scraped Highlights
     * 
     * @return          Array of indexes of section heading in the nodeArray
     * 
     */
    function getSectionIndexes(nodeArray) {
        let indexes = [];
        
        nodeArray.forEach((el, index) => {
            if (el.classList.contains('sectionHeading')) indexes.push(index);
        });

        return indexes;
    }

    /**
     * Split the scraped document node list into sections and highlights.
     * Leave out elements from the node list before the first section
     * 
     * Assumption: anything before the first sectionHeading is just meta, without highlights 
     * 
     * @param  nodeArray        an Array of nodeList to be split into sections
     * @param  splitIndexes     an Array of indexes where the nodeArray is sliced to sections
     * 
     * @return Array of nodeLists of sections and their highlights
     *          ex.: [div.sectionHeading...,div.noteHeading...,div.noteText...]
     */
    function splitIntoSections(nodeArray, splitIndexes) {
        /**
         * Array.prototype.slice()
         * copy a portion of an array into a new array object selected 
         * from begin to end (end not included) 
         * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice
         */
        
        var sections = [],
            temp;

        splitIndexes.forEach((splitPos, i) => {
            var temp;
            temp = nodeArray.slice(splitPos, splitIndexes[i+1])
            sections.push(temp);
        });  
        
        return sections;
    }

    /**
     * Slice the begining of the nodeList until the first section (meta of the scraped Highlights)
     * 
     * Assumption: anything before the first sectionHeading is just meta, without highlights
     * 
     * @param  nodeArray        an Array of nodeList to be split into sections
     * @param  splitIndexes     an Array of indexes where the nodeArray is sliced to sections
     * 
     * @return an Array of nodeList from the first element until the first section
     */
    function getScrapedMetaArray(nodeArray, splitIndexes) {
        return nodeArray.slice(0,splitIndexes[0]);;
    }

    /**
     * Builds an Array of sections with highlights
     * 
     * @param {Array} sections  Array of nodeList with sections and highlights,
     *                          expects the output value of splitIntoSections function
     * @return an Array of objects with highlights and properties =
     *          [
     *              {
     *                  "sectionTitle": String,
     *                  "noteCount": Number,
     *                  "notes": [
     *                     {
     *                          "type": String,
     *                          "location": String,
     *                          "level": String,
     *                          "text": String
     *                      }
     *                  ]  
     *              }
     *          ]
     */
    function buildSectionJSON(sections) {
        var sectionsToJSON = [];

        sections.forEach(section => {
            var sectionJSON = {
                "sectionTitle": undefined,
                "noteCount": undefined,
                "notes": []
            };

            sectionJSON.sectionTitle = section[0].innerText;
            // First element is the title, every note is represented with 
            // 2 elements: .noteHeading, .noteText
            // so the number of notes are half the number of elements in a section 
            // not counting the title
            sectionJSON.noteCount = (section.length-1)/2; 

            for (let index = 1; index < section.length; index = index+2) {
                var note = {
                    "type": undefined,
                    "location": undefined,
                    "level": undefined,
                    "text": undefined
                };
                const noteHeading = section[index];
                const noteText = section[index+1];

                note.type       = noteHeading.childNodes[0].nodeValue.trim().replace('(','');
                note.level      = noteHeading.childNodes[1].innerText.trim();
                note.location   = noteHeading.childNodes[2].nodeValue.trim().replace(') - Location ','');
                note.text       = noteText.innerText

                sectionJSON.notes.push(note);
            }
            
            sectionsToJSON.push(sectionJSON);

        });
        return sectionsToJSON;
    }

    function getAuthor(metaNodeList) {
        var author;
        metaNodeList.forEach(el => {
            if (el.classList.contains('authors')) {
                author = el.innerText;
            }
        });

        return author;
    }

    function getTitle(metaNodeList) {
        var title;
        metaNodeList.forEach(el => {
            if (el.classList.contains('bookTitle')) {
                title = el.innerText;
            }
        });

        return title;
    }

    return {
        getHighlights: getHighlights
    }
})();

const sp_IbookScraper = (function(){
    
    var scrapedHighlights,
        scrapedHighlightsArray,
        cleanScrapedHighlights,
        sectionsWithHighlights,
        metaSection,
        docJSON = {
            "authors": undefined,
            "title": undefined,
            "sections": []
        },
        sectionIndexes = [];
    
    /**
     * 
     * @param {*} docToScrape document element from the html export of Kindle highlights
     * 
     * @return               {
     *                          "authors": String,
     *                          "title": String,
     *                          "sections": [
     *                               {
     *                                   "sectionTitle": String,
     *                                   "noteCount": Number,
     *                                   "notes": [
     *                                       {
     *                                           "type": String,
     *                                           "location": String,
     *                                           "level": String,
     *                                           "text": String
     *                                       }
     *                                   ]  
     *                               }
     *                           ]
     *                      }
     */
    function getHighlights(docToScrape) {
        /** 
         * NodeLists are array-like but don't feature many of the methods provided by the Array, 
         * like forEach, map, filter, etc.
         * 
         * a very simple way to convert NodeLists to Arrays:
         *   
         *   var nodesArray = Array.prototype.slice.call(document.querySelectorAll("div"));
         * 
         * https://davidwalsh.name/nodelist-array
         */ 
        scrapedHighlights = docToScrape.querySelector('body div').childNodes;
        scrapedHighlightsArray = Array.prototype.slice.call(scrapedHighlights); // a very simple way to convert NodeLists to Arrays
        cleanScrapedHighlights = sp_Util.removeWhiteSpace(scrapedHighlightsArray);
        cleanScrapedHighlights = removeSeparators(cleanScrapedHighlights);
        sectionIndexes = getSectionIndexes(cleanScrapedHighlights);
        sectionsWithHighlights = splitIntoSections(cleanScrapedHighlights, sectionIndexes);
        metaSection = getScrapedMetaArray(cleanScrapedHighlights, sectionIndexes);

        docJSON.sections = buildSectionJSON(sectionsWithHighlights);
        docJSON.authors = getAuthor(metaSection);
        docJSON.title = getTitle(metaSection);

        return docJSON;
    }

    function removeSeparators(nodeArray) {
        return nodeArray.filter(nod => !nod.classList.contains('separator'));
    }

    /**
     * Find sections in the scraped document node list
     * 
     * @param nodeArray An array of cleaned nodes/elements of scraped Highlights
     * 
     * @return          Array of indexes of section heading in the nodeArray
     * 
     */
    function getSectionIndexes(nodeArray) {
        let indexes = [],
            sectionTitles = [],
            sectionIndex = 0;

        // Section title examples in .annotationchapter element:
        // "Chapter One: What Is Management?, p. 27"
        nodeArray.forEach((el, index) => {
            var annotationchapter = el.querySelector('.annotationchapter'),
                temp;
            if (annotationchapter) {
                temp = annotationchapter.innerText;
                temp = temp.split(', p. ');
                if (sectionTitles[sectionIndex-1] !== temp[0]) {
                    sectionTitles[sectionIndex] = temp[0];
                    sectionIndex += 1;
                    indexes.push(index);
                }
            }
        });
        return indexes;
    }

    /**
     * Split the scraped document node list into sections and highlights.
     * Leave out elements from the node list before the first section
     * 
     * Assumption: anything before the first sectionHeading is just meta, without highlights 
     * 
     * @param  nodeArray        an Array of nodeList to be split into sections
     * @param  splitIndexes     an Array of indexes where the nodeArray is sliced to sections
     * 
     * @return Array of nodeLists of sections and their highlights
     *          ex.: [div.sectionHeading...,div.noteHeading...,div.noteText...]
     */
    function splitIntoSections(nodeArray, splitIndexes) {
        /**
         * Array.prototype.slice()
         * copy a portion of an array into a new array object selected 
         * from begin to end (end not included) 
         * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice
         */
        
        var sections = [],
            temp;

        splitIndexes.forEach((splitPos, i) => {
            var temp;
            temp = nodeArray.slice(splitPos, splitIndexes[i+1])
            sections.push(temp);
        });  
        
        return sections;
    }

    /**
     * Slice the begining of the nodeList until the first section (meta of the scraped Highlights)
     * 
     * Assumption: anything before the first sectionHeading is just meta, without highlights
     * 
     * @param  nodeArray        an Array of nodeList to be split into sections
     * @param  splitIndexes     an Array of indexes where the nodeArray is sliced to sections
     * 
     * @return an Array of nodeList from the first element until the first section
     */
    function getScrapedMetaArray(nodeArray, splitIndexes) {
        return nodeArray.slice(0,splitIndexes[0]);;
    }

    /**
     * Builds an Array of sections with highlights
     * 
     * @param {Array} sections  Array of nodeList with sections and highlights,
     *                          expects the output value of splitIntoSections function
     * @return an Array of objects with highlights and properties =
     *          [
     *              {
     *                  "sectionTitle": String,
     *                  "noteCount": Number,
     *                  "notes": [
     *                     {
     *                          "type": String,
     *                          "location": String,
     *                          "level": String,
     *                          "text": String
     *                      }
     *                  ]  
     *              }
     *          ]
     */
    function buildSectionJSON(sections) {
        var sectionsToJSON = [];

        sections.forEach(section => {
            var sectionJSON = {
                "sectionTitle": undefined,
                "noteCount": undefined,
                "notes": []
            },
            tempHeader;

            // Every note is wrapped in .annotation element
            // .annotation
            //      .annotationheader
            //          .annotationdate
            //          .annotationchapter - includes the location as page number, ex: ', p. 8'
            //      .annotationcontent
            //          .annotationselectionMarker.yellow - highlight colour/level
            //          .annotationselectioninnermargin - decorative element, can be ignored
            //          .annotationrepresentativetext - highlighted text
            //          .annotationnote

            tempHeader = section[0].querySelector('.annotationchapter').innerText;
            tempHeader = tempHeader.split(', p. ');
            sectionJSON.sectionTitle = tempHeader[0];

            sectionJSON.noteCount = section.length; 
            section.forEach(el => {
                var note = {
                    "type": undefined,
                    "location": undefined,
                    "level": undefined,
                    "text": undefined
                },
                elements = {};

                if (el.classList.contains('annotation')) {
                    elements.noteHeading = el.querySelector('.annotationchapter');
                    elements.noteLevel = el.querySelector('.annotationselectionMarker');
                    elements.noteText = el.querySelector('.annotationrepresentativetext');

                    note.type       = undefined;
                    // Level: assumption: second class in the classList is the level value
                    note.level      = elements.noteLevel.classList.value.split(' ')[1];
                    // Location: examples in .annotationchapter element: "Chapter One: What Is Management?, p. 27"
                    note.location   = elements.noteHeading.innerText.split(', p. ')[1];
                    note.text       = elements.noteText.innerText;

                    sectionJSON.notes.push(note);
                }
            });
            
            sectionsToJSON.push(sectionJSON);

        });
        return sectionsToJSON;
    }

    function getAuthor(metaNodeList) {
        var author,
            titleElIndex;
        metaNodeList.forEach((el, i) => {
            if (el.classList.contains('booktitle')) {
                titleElIndex = i;
            }
        });

        author = metaNodeList[titleElIndex+1].innerText;
        return author;
    }

    function getTitle(metaNodeList) {
        var title;
        metaNodeList.forEach(el => {
            if (el.classList.contains('booktitle')) {
                title = el.innerText;
            }
        });

        return title;
    }

    return {
        getHighlights: getHighlights
    }
})();

const sp_Util = (function(){
    /**
     *
     * 
     * 
     * https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Whitespace_in_the_DOM
     * 
     * The Javascript code below defines several functions that make it easier 
     * to deal with whitespace in the DOM:
     *   - is_all_ws
     *   - is_ignorable
     *
     * Throughout, whitespace is defined as one of the characters
     *  "\t" TAB \u0009
     *  "\n" LF  \u000A
     *  "\r" CR  \u000D
     *  " "  SPC \u0020
     *
     * This does not use Javascript's "\s" because that includes non-breaking
     * spaces (and also some other characters).
     */

    /**
     * Determine whether a node's text content is entirely whitespace.
     *
     * @param nod  A node implementing the |CharacterData| interface (i.e.,
     *             a |Text|, |Comment|, or |CDATASection| node
     * @return     True if all of the text content of |nod| is whitespace,
     *             otherwise false.
     */
    function is_all_ws( nod )
    {
        // Use ECMA-262 Edition 3 String and RegExp features
        return !(/[^\t\n\r ]/.test(nod.textContent));
    }

    /**
     * Determine if a node should be ignored by the iterator functions.
     *
     * @param nod  An object implementing the DOM1 |Node| interface.
     * @return     true if the node is:
     *                1) A |Text| node that is all whitespace
     *                2) A |Comment| node
     *             and otherwise false.
     */
    function is_ignorable( nod )
    {
        return ( nod.nodeType == 8) || // A comment node
            ( (nod.nodeType == 3) && is_all_ws(nod) ); // a text node, all ws
    }

    /**
     * Ebook apps export book highlights to HTML which has whitespace elements.
     * These ignorable whitespace elements make it hard to manipulate and create new layout
     * 
     * @param {*} NodelistArray a nodeList converted to Array 
     *                          so Array.prototype.filter can be used
     * @return                  A new nodeList Array cleaned from all ignorable whitespace nodes
     */
    function cleanNodeListArrayFromWhiteSpace(NodelistArray){
        return NodelistArray.filter(nod => !is_ignorable(nod));
    }
    
    return {
        removeWhiteSpace: cleanNodeListArrayFromWhiteSpace
    }
})();