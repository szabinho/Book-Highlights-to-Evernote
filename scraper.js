function scrapeHighlights(docToScrape) {
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

    /**
     * Kindle app exports book highlights to HTML which has whitespace elements.
     * These ignorable whitespace elements make it hard to manipulate and create new layout.
     * 
     * https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Whitespace_in_the_DOM
     * 
     * The Javascript code below defines several functions that make it easier 
     * to deal with whitespace in the DOM:
     *   - is_all_ws
     *   - is_ignorable
     */

    /**
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

    // Find sections & their titles, position in the nodeList
    // Find book title & author
    // cleanScrapedHighlights.forEach((element, index) => {
    //     let elClassList = element.classList;

    //     if ( !(elClassList.contains('noteHeading') || elClassList.contains('noteText')) ) {
    //         if (element.classList.contains('sectionHeading')) {
    //             docJSON.sections.push({
    //                 "sectionTitle": element.innerText
    //             }); 
    //         }
    //         else if (element.classList.contains('bookTitle')) {
    //             docJSON.title = element.innerText
    //         }
    //         else if (element.classList.contains('authors')) {
    //             docJSON.authors = element.innerText
    //         } 
    //     }
    // });

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

    var scrapedHighlights = docToScrape.querySelector('.bodyContainer').childNodes,
        rawScrapedHighlightsArray = Array.prototype.slice.call(scrapedHighlights), // a very simple way to convert NodeLists to Arrays
        docJSON = {
            "authors": undefined,
            "title": undefined,
            "sections": []
        },
        sectionIndexes = [];

    const cleanScrapedHighlights = rawScrapedHighlightsArray.filter(nod => !is_ignorable(nod));
    sectionIndexes = getSectionIndexes(cleanScrapedHighlights);
    const sectionsWithHighlights = splitIntoSections(cleanScrapedHighlights, sectionIndexes);
    const metaSection = getScrapedMetaArray(cleanScrapedHighlights, sectionIndexes);

    docJSON.sections = buildSectionJSON(sectionsWithHighlights);
    docJSON.authors = getAuthor(metaSection);
    docJSON.title = getTitle(metaSection);



    // Templating and dom manipulation

    var sp_navHTML = '';
    var sectionHTML = '',
    sp_sectionEl = document.createElement('article');
    sp_sectionEl.classList.add('sp_highlights');

    docJSON.sections.forEach((section, curr) => {
        sp_navHTML += `<li id="#sp_section${curr+1}-toc">${section.sectionTitle}&nbsp;(${section.noteCount})</li>`;
        
        sectionHTML += `<section class="sp_section" id="sp_section${curr+1}">`;
        sectionHTML += `<h2 class="sp_section-title">${section.sectionTitle} (${section.noteCount})</h2>`;

        section.notes.forEach((note) => {
            var noteHTML = 
            `<p class="sp_note sp_note--${note.level} sp_note--${note.type}">
            <span class="sp_note-level">&bull;</span> ${note.text} 
            <span class="sp_note-location">Location: <span class="sp_note-location__value">${note.location}</span></span>
            </p>`;
            sectionHTML += noteHTML;
        });
        sectionHTML += '</section>';
    });

    var sp_header = document.createElement('header');
    sp_header.innerHTML = '<h1 class="sp_title"></h1><p class="sp_author"></p><ol class="sp_toc"></ol>';
    sp_header.querySelector('.sp_title').innerText = docJSON.title; 
    sp_header.querySelector('.sp_author').innerText = docJSON.authors;
    sp_header.querySelector('.sp_toc').innerHTML = sp_navHTML;
    sp_sectionEl.innerHTML = sectionHTML;

    sp_sectionEl.insertBefore(sp_header, sp_sectionEl.firstChild);
    document.querySelector('body').append(sp_sectionEl);
}