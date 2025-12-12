"""SEC EDGAR Form 4 integration service."""

import asyncio
import logging
import re
from datetime import date
from xml.etree import ElementTree as ET

import httpx

logger = logging.getLogger(__name__)

# SEC EDGAR constants
SEC_USER_AGENT = "StockGame admin@stockgame.example.com"
SEC_COMPANY_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json"

# Transaction codes mapping
TRANSACTION_CODES = {
    'P': 'Buy',
    'S': 'Sell',
    'A': 'Award',
    'D': 'Disposition to Issuer',
    'F': 'Tax Payment',
    'I': 'Discretionary',
    'M': 'Option Exercise',
    'C': 'Conversion',
    'E': 'Expiration',
    'G': 'Gift',
    'L': 'Small Acquisition',
    'W': 'Will or Laws of Descent',
    'Z': 'Trust Deposit',
    'J': 'Other',
}


class SECEdgarService:
    """Service for fetching and parsing SEC EDGAR Form 4 filings."""

    rate_limit_delay = 0.15  # 150ms between requests (safe for 10 req/sec)

    def __init__(self):
        """Initialize SEC EDGAR service."""
        self._last_request_time = 0.0
        self._company_tickers_cache = None

    async def _make_request(self, client: httpx.AsyncClient, url: str) -> httpx.Response:
        """Make rate-limited request with User-Agent header.

        Args:
            client: HTTP client to use for request
            url: URL to fetch

        Returns:
            HTTP response object

        Raises:
            httpx.HTTPError: On request failure
        """
        # Enforce rate limiting
        current_time = asyncio.get_event_loop().time()
        time_since_last = current_time - self._last_request_time

        if time_since_last < self.rate_limit_delay:
            await asyncio.sleep(self.rate_limit_delay - time_since_last)

        headers = {
            "User-Agent": SEC_USER_AGENT,
            "Accept": "application/json, text/xml, */*"
        }

        logger.debug(f"Making request to: {url}")
        response = await client.get(url, headers=headers, timeout=30.0)
        self._last_request_time = asyncio.get_event_loop().time()

        response.raise_for_status()
        return response

    async def get_company_cik(self, symbol: str, client: httpx.AsyncClient) -> str | None:
        """Get CIK for a company symbol from SEC's company_tickers.json.

        Args:
            symbol: Stock ticker symbol (e.g., 'AAPL')
            client: HTTP client to use

        Returns:
            CIK string (zero-padded to 10 digits) or None if not found
        """
        try:
            # Fetch and cache company tickers if not already cached
            if self._company_tickers_cache is None:
                response = await self._make_request(client, SEC_COMPANY_TICKERS_URL)
                self._company_tickers_cache = response.json()
                logger.info(f"Cached {len(self._company_tickers_cache)} company tickers")

            # Search for symbol in tickers data
            symbol_upper = symbol.upper()

            for entry in self._company_tickers_cache.values():
                if entry.get('ticker', '').upper() == symbol_upper:
                    cik_num = entry.get('cik_str')
                    # Pad CIK to 10 digits with leading zeros
                    cik = str(cik_num).zfill(10)
                    logger.info(f"Found CIK {cik} for symbol {symbol}")
                    return cik

            logger.warning(f"CIK not found for symbol: {symbol}")
            return None

        except Exception as e:
            logger.error(f"Error fetching CIK for {symbol}: {e}")
            return None

    async def fetch_form4_filings_list(
        self,
        cik: str,
        start_date: date,
        end_date: date,
        client: httpx.AsyncClient
    ) -> list[dict]:
        """Fetch list of Form 4 filings for a CIK in date range.

        Use SEC EDGAR submissions API: https://data.sec.gov/submissions/CIK{cik}.json

        Args:
            cik: Company CIK (10-digit zero-padded)
            start_date: Start date for filing search
            end_date: End date for filing search
            client: HTTP client to use

        Returns:
            List of filing dicts with accessionNumber, filingDate, primaryDocument
        """
        try:
            # SEC API requires CIK padded to 10 digits with leading zeros
            cik_padded = cik.zfill(10)
            url = f"https://data.sec.gov/submissions/CIK{cik_padded}.json"

            response = await self._make_request(client, url)
            data = response.json()

            filings_list = []

            # Check recent filings in main response
            recent = data.get('filings', {}).get('recent', {})

            if recent:
                filings_list.extend(self._extract_form4_filings(
                    recent, start_date, end_date, cik
                ))

            # Check additional files if they exist
            files = data.get('filings', {}).get('files', [])
            for file_info in files:
                # Only fetch additional files if they might contain relevant dates
                # Files are named like "CIK{cik}-submissions-{sequence}.json"
                file_name = file_info.get('name', '')
                if file_name:
                    file_url = f"https://data.sec.gov/submissions/{file_name}"
                    try:
                        file_response = await self._make_request(client, file_url)
                        file_data = file_response.json()
                        filings_list.extend(self._extract_form4_filings(
                            file_data, start_date, end_date, cik
                        ))
                    except Exception as e:
                        logger.warning(f"Error fetching additional filings file {file_name}: {e}")

            logger.info(f"Found {len(filings_list)} Form 4 filings for CIK {cik} "
                       f"between {start_date} and {end_date}")
            return filings_list

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                logger.warning(f"No submissions found for CIK {cik}")
                return []
            logger.error(f"HTTP error fetching filings for CIK {cik}: {e}")
            return []
        except Exception as e:
            logger.error(f"Error fetching Form 4 filings for CIK {cik}: {e}")
            return []

    def _extract_form4_filings(
        self,
        filings_data: dict,
        start_date: date,
        end_date: date,
        cik: str
    ) -> list[dict]:
        """Extract Form 4 filings from submissions data within date range.

        Args:
            filings_data: Filings data dict from SEC API
            start_date: Start date filter
            end_date: End date filter
            cik: Company CIK

        Returns:
            List of Form 4 filing dicts
        """
        form_types = filings_data.get('form', [])
        filing_dates = filings_data.get('filingDate', [])
        accession_numbers = filings_data.get('accessionNumber', [])
        primary_documents = filings_data.get('primaryDocument', [])

        filings = []

        for i, form_type in enumerate(form_types):
            if form_type != '4':
                continue

            if i >= len(filing_dates) or i >= len(accession_numbers):
                continue

            filing_date_str = filing_dates[i]

            try:
                filing_date = date.fromisoformat(filing_date_str)

                # Filter by date range
                if start_date <= filing_date <= end_date:
                    accession = accession_numbers[i]
                    primary_doc = primary_documents[i] if i < len(primary_documents) else None

                    filings.append({
                        'cik': cik,
                        'accessionNumber': accession,
                        'filingDate': filing_date_str,
                        'primaryDocument': primary_doc
                    })
            except (ValueError, TypeError) as e:
                logger.warning(f"Invalid filing date {filing_date_str}: {e}")
                continue

        return filings

    async def fetch_form4_xml(
        self,
        cik: str,
        accession_number: str,
        client: httpx.AsyncClient
    ) -> str | None:
        """Fetch Form 4 XML content from SEC archives.

        Fetches the filing directory listing to find the actual XML filename,
        since SEC filings use variable naming patterns (primary_doc.xml, wk-form4_*.xml, etc.)

        Args:
            cik: Company CIK (10-digit zero-padded)
            accession_number: Filing accession number (with dashes)
            client: HTTP client to use

        Returns:
            XML content string or None on error
        """
        try:
            # Remove dashes from accession number for URL path
            accession_no_dashes = accession_number.replace('-', '')

            # Remove leading zeros from CIK for URL
            cik_num = str(int(cik))

            # Base URL for the filing directory
            base_url = f"https://www.sec.gov/Archives/edgar/data/{cik_num}/{accession_no_dashes}"

            # First, try primary_doc.xml (fastest path for compliant filings)
            primary_url = f"{base_url}/primary_doc.xml"
            try:
                response = await self._make_request(client, primary_url)
                xml_content = response.text
                logger.debug(f"Fetched Form 4 XML from {primary_url}")
                return xml_content
            except httpx.HTTPStatusError as e:
                if e.response.status_code != 404:
                    raise
                # primary_doc.xml not found, need to check directory listing

            # Fetch the filing directory listing to find the XML file
            dir_url = f"{base_url}/"
            try:
                dir_response = await self._make_request(client, dir_url)
                dir_html = dir_response.text

                # Parse the HTML to find XML files (look for form4-related XML files)
                # SEC directory listings have links like: <a href="...filename.xml">
                xml_files = []
                for match in re.finditer(r'href="([^"]+\.xml)"', dir_html, re.IGNORECASE):
                    filename = match.group(1)
                    # Filter to form4-related files (exclude xbrl, etc)
                    if 'form4' in filename.lower() or 'wk-' in filename.lower() or 'doc4' in filename.lower():
                        xml_files.append(filename)

                # Try each found XML file
                for xml_file in xml_files:
                    # Handle both relative and absolute URLs
                    if xml_file.startswith('/'):
                        xml_url = f"https://www.sec.gov{xml_file}"
                    elif xml_file.startswith('http'):
                        xml_url = xml_file
                    else:
                        xml_url = f"{base_url}/{xml_file}"

                    try:
                        response = await self._make_request(client, xml_url)
                        xml_content = response.text
                        # Verify it's a Form 4 XML (has ownershipDocument root)
                        if '<ownershipDocument>' in xml_content or '<XML>' in xml_content:
                            logger.debug(f"Fetched Form 4 XML from {xml_url}")
                            return xml_content
                    except httpx.HTTPStatusError:
                        continue

                logger.warning(f"Could not find Form 4 XML for accession {accession_number}")
                return None

            except Exception as dir_error:
                logger.warning(f"Error fetching directory listing for {accession_number}: {dir_error}")
                return None

        except Exception as e:
            logger.error(f"Error fetching Form 4 XML for {accession_number}: {e}")
            return None

    def parse_form4_xml(self, xml_content: str, symbol: str) -> list[dict]:
        """Parse Form 4 XML and extract insider trade data.

        Parse XML elements for:
        - reportingOwner: name, cik, relationship (isOfficer, isDirector, isTenPercentOwner), officerTitle
        - nonDerivativeTransaction and derivativeTransaction:
          - transactionDate, transactionCode
          - transactionAmounts: shares, price, acquiredDisposedCode
          - postTransactionAmounts: sharesOwnedFollowingTransaction
          - ownershipNature: directOrIndirectOwnership

        Args:
            xml_content: Raw XML content from Form 4
            symbol: Stock ticker symbol

        Returns:
            List of trade dicts with all fields
        """
        trades = []

        try:
            root = ET.fromstring(xml_content)

            # Extract reporting owner information
            reporting_owners = root.findall('.//reportingOwner')

            for owner in reporting_owners:
                owner_info = self._parse_reporting_owner(owner)

                # Parse non-derivative transactions
                non_deriv_transactions = root.findall('.//nonDerivativeTransaction')
                for transaction in non_deriv_transactions:
                    trade = self._parse_transaction(transaction, owner_info, symbol, is_derivative=False)
                    if trade:
                        trades.append(trade)

                # Parse derivative transactions
                deriv_transactions = root.findall('.//derivativeTransaction')
                for transaction in deriv_transactions:
                    trade = self._parse_transaction(transaction, owner_info, symbol, is_derivative=True)
                    if trade:
                        trades.append(trade)

            logger.info(f"Parsed {len(trades)} trades from Form 4 XML for {symbol}")
            return trades

        except ET.ParseError as e:
            logger.error(f"XML parsing error for {symbol}: {e}")
            return []
        except Exception as e:
            logger.error(f"Error parsing Form 4 XML for {symbol}: {e}")
            return []

    def _parse_reporting_owner(self, owner_elem: ET.Element) -> dict:
        """Parse reporting owner information from XML element.

        Args:
            owner_elem: reportingOwner XML element

        Returns:
            Dict with owner information
        """
        owner_info = {}

        # Parse owner identity
        owner_id = owner_elem.find('.//reportingOwnerId')
        if owner_id is not None:
            owner_info['insider_cik'] = self._get_text(owner_id, 'rptOwnerCik')
            owner_info['insider_name'] = self._get_text(owner_id, 'rptOwnerName')

        # Parse owner relationship
        relationship = owner_elem.find('.//reportingOwnerRelationship')
        if relationship is not None:
            owner_info['is_officer'] = self._get_text(relationship, 'isOfficer') == '1'
            owner_info['is_director'] = self._get_text(relationship, 'isDirector') == '1'
            owner_info['is_ten_percent_owner'] = self._get_text(relationship, 'isTenPercentOwner') == '1'
            owner_info['officer_title'] = self._get_text(relationship, 'officerTitle', default='')

        return owner_info

    def _parse_transaction(
        self,
        transaction_elem: ET.Element,
        owner_info: dict,
        symbol: str,
        is_derivative: bool
    ) -> dict | None:
        """Parse individual transaction from XML element.

        Args:
            transaction_elem: Transaction XML element
            owner_info: Reporting owner information
            symbol: Stock ticker symbol
            is_derivative: Whether this is a derivative transaction

        Returns:
            Trade dict or None if parsing fails
        """
        try:
            trade = {
                'symbol': symbol,
                'is_derivative': is_derivative,
                **owner_info
            }

            # Transaction date
            trade['transaction_date'] = self._get_text(
                transaction_elem,
                './/transactionDate/value',
                default=None
            )

            if not trade['transaction_date']:
                logger.warning("Transaction missing date, skipping")
                return None

            # Transaction coding
            coding = transaction_elem.find('.//transactionCoding')
            if coding is not None:
                transaction_code = self._get_text(coding, 'transactionCode')
                trade['transaction_code'] = transaction_code
                trade['transaction_type'] = TRANSACTION_CODES.get(transaction_code, 'Unknown')

            # Transaction amounts
            amounts = transaction_elem.find('.//transactionAmounts')
            if amounts is not None:
                shares_str = self._get_text(amounts, 'transactionShares/value', default='0')
                price_str = self._get_text(amounts, 'transactionPricePerShare/value', default='0')

                try:
                    trade['shares'] = float(shares_str) if shares_str else 0.0
                except (ValueError, TypeError):
                    trade['shares'] = 0.0

                try:
                    trade['price_per_share'] = float(price_str) if price_str else 0.0
                except (ValueError, TypeError):
                    trade['price_per_share'] = 0.0

                # Acquired (A) or Disposed (D)
                acquired_disposed = self._get_text(amounts, 'acquiredDisposedCode/value')
                trade['acquired_disposed_code'] = acquired_disposed

            # Post-transaction amounts
            post_amounts = transaction_elem.find('.//postTransactionAmounts')
            if post_amounts is not None:
                shares_owned_str = self._get_text(
                    post_amounts,
                    'sharesOwnedFollowingTransaction/value',
                    default='0'
                )
                try:
                    trade['shares_owned_following'] = float(shares_owned_str) if shares_owned_str else 0.0
                except (ValueError, TypeError):
                    trade['shares_owned_following'] = 0.0

            # Ownership nature
            ownership = transaction_elem.find('.//ownershipNature')
            if ownership is not None:
                direct_indirect = self._get_text(ownership, 'directOrIndirectOwnership/value')
                trade['direct_or_indirect'] = direct_indirect
                trade['nature_of_ownership'] = self._get_text(
                    ownership,
                    'natureOfOwnership/value',
                    default=''
                )

            return trade

        except Exception as e:
            logger.warning(f"Error parsing transaction: {e}")
            return None

    def _get_text(
        self,
        element: ET.Element,
        path: str,
        default: str | None = None
    ) -> str | None:
        """Safely extract text from XML element.

        Args:
            element: Parent XML element
            path: XPath to child element
            default: Default value if not found

        Returns:
            Text content or default value
        """
        if element is None:
            return default

        child = element.find(path)
        if child is not None and child.text:
            return child.text.strip()

        # Try direct child if path is simple
        if '/' not in path or path.startswith('.//'):
            child = element.find(f'.//{path.lstrip(".//")}')
            if child is not None and child.text:
                return child.text.strip()

        return default
